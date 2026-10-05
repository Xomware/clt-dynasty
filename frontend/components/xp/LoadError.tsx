interface LoadErrorProps {
  what: string;
  message: string;
  onRetry: () => void;
}

export function LoadError({ what, message, onRetry }: LoadErrorProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="alert">
        Couldn&rsquo;t load {what}: {message}
      </p>
      <button type="button" className="xp-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
