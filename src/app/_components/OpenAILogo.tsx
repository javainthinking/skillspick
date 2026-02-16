/** Light mode: openai_light.svg; dark mode: openai.svg */
export default function OpenAILogo({ className = "h-4 w-4 opacity-80 group-hover:opacity-100" }: { className?: string }) {
  return (
    <span className="inline-block size-4">
      <img
        src="/brands/openai_light.svg"
        alt="OpenAI"
        className={`${className} dark:hidden`}
      />
      <img
        src="/brands/openai.svg"
        alt="OpenAI"
        className={`${className} hidden dark:block`}
      />
    </span>
  );
}
