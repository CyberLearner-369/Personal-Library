import { useNavigate } from 'react-router-dom';
import { BookX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<BookX size={40} strokeWidth={1.5} />}
      title="Page not found"
      description="That shelf doesn’t exist. Perhaps the link is old."
      action={
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to the dashboard
        </Button>
      }
      className="mt-10"
    />
  );
}
