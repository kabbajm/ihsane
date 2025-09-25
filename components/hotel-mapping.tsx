"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Building, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface HotelMapping {
  id: string
  hotel_name: string
  email_address: string
  created_at: string
  updated_at: string
}

export function HotelMapping() {
  const [mappings, setMappings] = useState<HotelMapping[]>([])
  const [newHotel, setNewHotel] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadMappings()
  }, [])

  const loadMappings = async () => {
    try {
      const { data, error } = await supabase
        .from("hotel_mappings")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setMappings(data || [])
    } catch (error) {
      console.error("Error loading mappings:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les mappings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addMapping = async () => {
    if (!newHotel.trim() || !newEmail.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      })
      return
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email valide.",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)

    try {
      const { data, error } = await supabase
        .from("hotel_mappings")
        .insert([
          {
            hotel_name: newHotel.trim(),
            email_address: newEmail.trim(),
          },
        ])
        .select()

      if (error) throw error

      // Add to local state
      if (data && data[0]) {
        setMappings([data[0], ...mappings])
      }

      setNewHotel("")
      setNewEmail("")

      toast({
        title: "Mapping ajouté",
        description: `${newHotel} a été ajouté avec succès.`,
      })
    } catch (error) {
      console.error("Error adding mapping:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le mapping.",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const deleteMapping = async (id: string) => {
    try {
      const { error } = await supabase.from("hotel_mappings").delete().eq("id", id)

      if (error) throw error

      const mapping = mappings.find((m) => m.id === id)
      setMappings(mappings.filter((m) => m.id !== id))

      toast({
        title: "Mapping supprimé",
        description: `${mapping?.hotel_name} a été supprimé avec succès.`,
      })
    } catch (error) {
      console.error("Error deleting mapping:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le mapping.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add New Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un nouveau mapping
          </CardTitle>
          <CardDescription>Associez un hôtel Jumbonline à une adresse email de destination</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hotel-name">Nom de l'hôtel (tel qu'il apparaît dans le PDF)</Label>
              <Input
                id="hotel-name"
                placeholder="Ex: RIAD CATALINA MARRAKECH"
                value={newHotel}
                onChange={(e) => setNewHotel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-email">Email de destination</Label>
              <Input
                id="hotel-email"
                type="email"
                placeholder="manager@hotel.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={addMapping} disabled={isAdding} className="w-full md:w-auto">
            {isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le mapping
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Mappings existants
          </CardTitle>
          <CardDescription>Gérez les associations hôtel-email existantes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hôtel</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun mapping configuré. Ajoutez votre premier mapping ci-dessus.
                  </TableCell>
                </TableRow>
              ) : (
                mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {mapping.hotel_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {mapping.email_address}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(mapping.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => deleteMapping(mapping.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
