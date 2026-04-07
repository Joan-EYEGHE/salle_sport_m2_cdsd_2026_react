export default function Loader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center py-8">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-700 border-t-amber-500`}
      />
    </div>
  );
}
