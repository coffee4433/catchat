export function CatLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <div className={`${className} overflow-hidden rounded-2xl flex items-center justify-center`}>
      <img
        src="/catchat.png"
        alt="CatChat Logo"
        className="w-full h-full object-cover scale-135"
      />
    </div>
  )
}
