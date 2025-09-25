"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Mail, FileText, Save, CheckCircle, Key } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface SystemSettings {
  incomingEmailServer: string
  incomingEmailPort: string
  incomingEmailUsername: string
  incomingEmailPassword: string
  incomingEmailUseTls: boolean
  incomingEmailFolder: string
  emailSubjectFilter: string
  resendApiKey: string
  emailFromAddress: string
  autoProcess: boolean
  hideRatesDefault: boolean
  addLogoDefault: boolean
  logoUrl: string
  processingInterval: string
  maxRetries: string
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    incomingEmailServer: "imap.gmail.com",
    incomingEmailPort: "993",
    incomingEmailUsername: "",
    incomingEmailPassword: "",
    incomingEmailUseTls: true,
    incomingEmailFolder: "INBOX",
    emailSubjectFilter: "Handler – New Bookings",
    resendApiKey: "",
    emailFromAddress: "",
    autoProcess: true,
    hideRatesDefault: true,
    addLogoDefault: true,
    logoUrl: "",
    processingInterval: "5",
    maxRetries: "3",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("*")

      if (error) throw error

      if (data && data.length > 0) {
        // Convert array of settings to object
        const settingsObj = data.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value
          return acc
        }, {} as any)

        setSettings((prev) => ({ ...prev, ...settingsObj }))
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }))

      // Delete existing settings and insert new ones
      await supabase.from("system_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      const { error } = await supabase.from("system_settings").insert(settingsArray)

      if (error) throw error

      toast({
        title: "Paramètres sauvegardés",
        description: "Vos paramètres ont été mis à jour avec succès.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Simulation de l'upload
      const url = URL.createObjectURL(file)
      setSettings({ ...settings, logoUrl: url })
      toast({
        title: "Logo téléchargé",
        description: "Votre logo a été téléchargé avec succès.",
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
      {/* Serveur Email de Réception */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Serveur Email de Réception
          </CardTitle>
          <CardDescription>
            Configuration pour recevoir automatiquement les emails "Handler – New Bookings"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incoming-email-server">Serveur IMAP</Label>
              <Input
                id="incoming-email-server"
                value={settings.incomingEmailServer}
                onChange={(e) => setSettings({ ...settings, incomingEmailServer: e.target.value })}
                placeholder="imap.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incoming-email-port">Port IMAP</Label>
              <Input
                id="incoming-email-port"
                value={settings.incomingEmailPort}
                onChange={(e) => setSettings({ ...settings, incomingEmailPort: e.target.value })}
                placeholder="993"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incoming-email-username">Email de réception</Label>
              <Input
                id="incoming-email-username"
                type="email"
                placeholder="reception@votre-domain.com"
                value={settings.incomingEmailUsername}
                onChange={(e) => setSettings({ ...settings, incomingEmailUsername: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incoming-email-password">Mot de passe</Label>
              <Input
                id="incoming-email-password"
                type="password"
                placeholder="••••••••"
                value={settings.incomingEmailPassword}
                onChange={(e) => setSettings({ ...settings, incomingEmailPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Utiliser TLS/SSL (IMAP)</Label>
              <p className="text-sm text-muted-foreground">Active la connexion sécurisée TLS/SSL pour la réception</p>
            </div>
            <Switch
              checked={settings.incomingEmailUseTls}
              onCheckedChange={(checked) => setSettings({ ...settings, incomingEmailUseTls: checked })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email-folder">Dossier à surveiller</Label>
              <Input
                id="email-folder"
                value={settings.incomingEmailFolder}
                onChange={(e) => setSettings({ ...settings, incomingEmailFolder: e.target.value })}
                placeholder="INBOX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject-filter">Filtre objet email</Label>
              <Input
                id="subject-filter"
                value={settings.emailSubjectFilter}
                onChange={(e) => setSettings({ ...settings, emailSubjectFilter: e.target.value })}
                placeholder="Handler – New Bookings"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Surveillance automatique</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Le système vérifiera automatiquement les nouveaux emails avec l'objet "{settings.emailSubjectFilter}"
                  toutes les {settings.processingInterval} minutes et traitera les PDFs joints.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuration Resend (Envoi d'emails)
          </CardTitle>
          <CardDescription>Configuration de l'API Resend pour l'envoi d'emails avec pièces jointes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend-api-key">Clé API Resend</Label>
            <Input
              id="resend-api-key"
              type="password"
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={settings.resendApiKey}
              onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Obtenez votre clé API sur{" "}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                resend.com/api-keys
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-from-address">Adresse email d'envoi</Label>
            <Input
              id="email-from-address"
              type="email"
              placeholder="noreply@votre-domaine.com"
              value={settings.emailFromAddress}
              onChange={(e) => setSettings({ ...settings, emailFromAddress: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">Cette adresse doit être vérifiée dans votre compte Resend</p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Avantages de Resend</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  • Compatible avec Vercel Edge Runtime
                  <br />• Support natif des pièces jointes PDF
                  <br />• Pas de configuration SMTP complexe
                  <br />• Délivrabilité optimisée
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Traitement PDF Jumbonline
          </CardTitle>
          <CardDescription>Options par défaut pour le traitement des PDFs Jumbonline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label>Supprimer le logo Jumbonline</Label>
              <p className="text-sm text-muted-foreground">Retire automatiquement le logo Jumbonline de l'en-tête</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Masquer les tarifs par défaut</Label>
              <p className="text-sm text-muted-foreground">Cache automatiquement tous les montants MAD dans les PDFs</p>
            </div>
            <Switch
              checked={settings.hideRatesDefault}
              onCheckedChange={(checked) => setSettings({ ...settings, hideRatesDefault: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ajouter votre logo par défaut</Label>
              <p className="text-sm text-muted-foreground">Remplace le logo Jumbonline par le vôtre</p>
            </div>
            <Switch
              checked={settings.addLogoDefault}
              onCheckedChange={(checked) => setSettings({ ...settings, addLogoDefault: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-upload">Logo de remplacement</Label>
            <div className="flex items-center gap-4">
              <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="flex-1" />
              {settings.logoUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={settings.logoUrl || "/placeholder.svg"}
                    alt="Logo"
                    className="h-8 w-8 object-contain rounded"
                  />
                  <span className="text-sm text-green-600">✓</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automatisation
          </CardTitle>
          <CardDescription>Paramètres de traitement automatique</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Traitement automatique</Label>
              <p className="text-sm text-muted-foreground">Traite automatiquement les emails entrants</p>
            </div>
            <Switch
              checked={settings.autoProcess}
              onCheckedChange={(checked) => setSettings({ ...settings, autoProcess: checked })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="processing-interval">Intervalle de vérification (minutes)</Label>
              <Select
                value={settings.processingInterval}
                onValueChange={(value) => setSettings({ ...settings, processingInterval: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-retries">Nombre max de tentatives</Label>
              <Select
                value={settings.maxRetries}
                onValueChange={(value) => setSettings({ ...settings, maxRetries: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 tentative</SelectItem>
                  <SelectItem value="3">3 tentatives</SelectItem>
                  <SelectItem value="5">5 tentatives</SelectItem>
                  <SelectItem value="10">10 tentatives</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les paramètres
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
