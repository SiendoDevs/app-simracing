import { SignIn } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="mx-auto max-w-md p-6">
      <SignIn appearance={{ elements: { formButtonPrimary: "bg-[#d8552b] hover:bg-[#d8552b]/90" } }} />
    </div>
  )
}

