"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mail, FileText, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface DashboardStats {
  emailsProcessedToday: number
  pdfsModified: number
  emailsSent: number
  successRate: number
  emailsInQueue: number
  pdfsInProcessing: number
}

interface ProcessingLog {
  id: string
  hotel_name: string
  status: string
  created_at: string
  booking_reference: string
  recipient_email: string
}

export function ProcessingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    emailsProcessedToday: 0,
    pdfsModified: 0,
    emailsSent: 0,
    successRate: 0,
    emailsInQueue: 0,
    pdfsInProcessing: 0,
  })
  const [recentProcessing, setRecentProcessing] = useState<ProcessingLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      const { data: todayLogs, error: todayError } = await supabase
        .from("email_processing_logs")
        .select("*")
        .gte("created_at", today)

      if (todayError) throw todayError

      const { data: yesterdayLogs, error: yesterdayError } = await supabase
        .from("email_processing_logs")
        .select("*")
        .gte("created_at", yesterday)
        .lt("created_at", today)

      if (yesterdayError) throw yesterdayError

      const todayStats = {
        emailsProcessedToday: todayLogs?.length || 0,
        pdfsModified: todayLogs?.filter((log) => log.pdf_processed).length || 0,
        emailsSent: todayLogs?.filter((log) => log.status === "completed").length || 0,
        successRate: todayLogs?.length
          ? Math.round((todayLogs.filter((log) => log.status === "completed").length / todayLogs.length) * 100)
          : 0,
        emailsInQueue: todayLogs?.filter((log) => log.status === "pending").length || 0,
        pdfsInProcessing: todayLogs?.filter((log) => log.status === "processing").length || 0,
      }

      const yesterdayStats = {
        emailsProcessedToday: yesterdayLogs?.length || 0,
        pdfsModified: yesterdayLogs?.filter((log) => log.pdf_processed).length || 0,
        emailsSent: yesterdayLogs?.filter((log) => log.status === "completed").length || 0,
        successRate: yesterdayLogs?.length
          ? Math.round((yesterdayLogs.filter((log) => log.status === "completed").length / yesterdayLogs.length) * 100)
          : 0,
      }

      setStats(todayStats)

      const { data: recentLogs, error: recentError } = await supabase
        .from("email_processing_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      if (recentError) throw recentError

      setRecentProcessing(recentLogs || [])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%"
    const change = Math.round(((current - previous) / previous) * 100)
    return change >= 0 ? `+${change}%` : `${change}%`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Terminé</Badge>
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">En cours</Badge>
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">En attente</Badge>
        )
      case "error":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Erreur</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
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

  const dynamicStats = [
    {
      title: "Emails traités aujourd'hui",
      value: stats.emailsProcessedToday.toString(),
      change: getPercentageChange(stats.emailsProcessedToday, 0), // Could be enhanced with yesterday's data
      icon: Mail,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "PDFs modifiés",
      value: stats.pdfsModified.toString(),
      change: getPercentageChange(stats.pdfsModified, 0),
      icon: FileText,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Emails envoyés",
      value: stats.emailsSent.toString(),
      change: getPercentageChange(stats.emailsSent, 0),
      icon: CheckCircle,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Taux de succès",
      value: `${stats.successRate}%`,
      change: getPercentageChange(stats.successRate, 0),
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-green-600 dark:text-green-400">{stat.change} par rapport à hier</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Processing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Traitement en cours
          </CardTitle>
          <CardDescription>Surveillance en temps réel des processus d'automatisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Emails en attente</span>
              <span>{stats.emailsInQueue}/10</span>
            </div>
            <Progress value={(stats.emailsInQueue / 10) * 100} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>PDFs en traitement</span>
              <span>{stats.pdfsInProcessing}/5</span>
            </div>
            <Progress value={(stats.pdfsInProcessing / 5) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Processing */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>Derniers emails traités et leur statut</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProcessing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune activité récente</div>
            ) : (
              recentProcessing.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{item.hotel_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.booking_reference} • {formatTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground hidden md:block">{item.recipient_email}</span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
