import { Dumbbell } from 'lucide-react';

export default function Loader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  if (size === 'sm') {
    return (
      <div className="flex items-center justify-center py-4">
        <Dumbbell className="w-5 h-5 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Dumbbell className="w-10 h-10 text-amber-500 animate-spin" />
      <p className="text-gray-500 text-sm font-medium">Loading...</p>
      <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full animate-pulse w-2/3" />
      </div>
    </div>
  );
}
