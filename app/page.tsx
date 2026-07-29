import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getConversations } from '@/app/actions/chat'
import { ChatApp } from '@/components/chat-app'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [fullUser] = await db
    .select({ image: user.image, banner: user.banner })
    .from(user)
    .where(eq(user.id, session.user.id))

  const initialConversations = await getConversations()

  return (
    <ChatApp
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: fullUser?.image ?? session.user.image,
        banner: fullUser?.banner ?? null,
      }}
      initialConversations={initialConversations}
    />
  )
}
