export function CatLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <img
      src="/catchat.png"
      alt="CatChat Logo"
      className={`${className} object-contain`}
    />
  )
}
