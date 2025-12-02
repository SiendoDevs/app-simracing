"use client"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"

export default function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-2 py-1 text-sm rounded-md border bg-background hover:bg-muted">Ingresar</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  )
}
