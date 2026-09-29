const SIZES = {
  sm: { image: "w-28", tag: "text-[9px] tracking-[0.18em]" },
  md: { image: "w-40", tag: "text-[10px] tracking-[0.16em]" },
  lg: { image: "w-56", tag: "text-[11px] tracking-[0.2em]" },
  xl: { image: "w-64 sm:w-80", tag: "text-xs tracking-[0.35em]" },
};

export default function Logo({ size = "md", tagline = null, className = "" }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`min-w-0 ${className}`}>
        <img src={`${import.meta.env.BASE_URL}scomptec-logo.webp`} alt="SCOMPTEC" width="320" height="88" className={`block h-auto max-w-full object-contain ${s.image}`} />
        {tagline && (
          <p className={`mt-1 font-semibold uppercase text-text-muted ${s.tag}`}>{tagline}</p>
        )}
    </div>
  );
}
