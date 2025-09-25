declare global {
  interface Window {
    Email: {
      send: (config: {
        SecureToken?: string
        Host?: string
        Username?: string
        Password?: string
        To: string
        From: string
        Subject: string
        Body: string
        Attachments?: Array<{
          name: string
          data: string
        }>
      }) => Promise<string>
    }
  }
}

export {}
