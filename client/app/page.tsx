import Link from "next/link"
import { ArrowRight, Upload, Download, Shield, Clock, Hash, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import FeatureCard from "@/components/feature-card"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Zap className="h-6 w-6 text-primary" />
            <span>ShareDirect</span>
          </div>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Link href="/upload" className="text-sm font-medium hover:underline underline-offset-4">
              Upload
            </Link>
            <Link href="/about" className="text-sm font-medium hover:underline underline-offset-4">
              About
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-muted/50 to-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Secure P2P File Sharing
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Transfer files directly between devices without uploading to a server. Fast, secure, and private.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg">
                  <Link href="/upload">
                    Start Sharing <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  ShareDirect uses WebRTC technology to establish direct connections between devices, ensuring your
                  files never touch our servers.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <FeatureCard
                  icon={<Upload className="h-10 w-10 text-primary" />}
                  title="Upload & Share"
                  description="Select your file, customize sharing options, and get a unique link to share with recipients."
                />
                <FeatureCard
                  icon={<Download className="h-10 w-10 text-primary" />}
                  title="Direct Download"
                  description="Recipients use the link to establish a direct connection and download the file from your device."
                />
                <FeatureCard
                  icon={<Shield className="h-10 w-10 text-primary" />}
                  title="Secure Transfer"
                  description="End-to-end encryption ensures your files remain private and secure during transfer."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Key Features</h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  ShareDirect is designed with security, privacy, and ease of use in mind.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <FeatureCard
                  icon={<Clock className="h-10 w-10 text-primary" />}
                  title="Link Expiration"
                  description="Set expiration times for your shared links to maintain control over your files."
                />
                <FeatureCard
                  icon={<Hash className="h-10 w-10 text-primary" />}
                  title="Download Limits"
                  description="Restrict the number of times your file can be downloaded for added security."
                />
                <FeatureCard
                  icon={<Zap className="h-10 w-10 text-primary" />}
                  title="Fast Transfers"
                  description="Direct peer-to-peer connections ensure the fastest possible transfer speeds."
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:h-16 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ShareDirect. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link
              href="/terms"
              className="text-sm font-medium text-muted-foreground hover:underline underline-offset-4"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm font-medium text-muted-foreground hover:underline underline-offset-4"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

