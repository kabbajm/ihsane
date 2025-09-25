"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, FileText, Settings, Activity } from "lucide-react"
import { EmailProcessor } from "@/components/email-processor"
import { HotelMapping } from "@/components/hotel-mapping"
import { ProcessingDashboard } from "@/components/processing-dashboard"
import { SystemSettings } from "@/components/system-settings"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Email Automation</h1>
                <p className="text-sm text-muted-foreground">Système de traitement automatique des réservations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950"
              >
                Actif
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="processor" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Processeur
            </TabsTrigger>
            <TabsTrigger value="mapping" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Mapping
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <ProcessingDashboard />
          </TabsContent>

          <TabsContent value="processor" className="space-y-6">
            <EmailProcessor />
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            <HotelMapping />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
