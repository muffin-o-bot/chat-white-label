import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import ChatClient from './ChatClient';

export default async function ChatPage() {
  const user = await getAuthUser();
  
  if (!user) {
    redirect('/login');
  }

  return <ChatClient user={user} />;
}
