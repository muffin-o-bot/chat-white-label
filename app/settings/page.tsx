import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const user = await getAuthUser();
  
  if (!user) {
    redirect('/login');
  }

  const personalization = await prisma.chatPersonalization.findUnique({
    where: { userId: user.id },
  });

  return (
    <SettingsClient 
      user={user} 
      personalization={personalization ? {
        displayName: personalization.displayName,
        tone: personalization.tone,
        instructions: personalization.instructions,
        model: personalization.model,
      } : null}
    />
  );
}
