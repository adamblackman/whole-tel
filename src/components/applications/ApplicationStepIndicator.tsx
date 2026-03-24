interface ApplicationStepIndicatorProps {
  current: number
  total: number
  labels: string[]
}

export function ApplicationStepIndicator({
  current,
  total,
  labels,
}: ApplicationStepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      {/* Mobile: compact text */}
      <p className="text-sm text-muted-foreground text-center sm:hidden">
        Step {current + 1} of {total} &mdash; {labels[current]}
      </p>

      {/* Desktop: full horizontal indicator */}
      <div className="hidden sm:flex items-center justify-between">
        {labels.map((label, index) => {
          const isCompleted = index < current
          const isCurrent = index === current

          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                    isCompleted
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : isCurrent
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    'mt-1.5 text-xs font-medium whitespace-nowrap',
                    isCurrent ? 'text-teal-700' : isCompleted ? 'text-teal-600' : 'text-gray-400',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>

              {index < labels.length - 1 && (
                <div
                  className={[
                    'h-0.5 flex-1 mx-2 -mt-5 transition-colors',
                    isCompleted ? 'bg-teal-600' : 'bg-gray-200',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
