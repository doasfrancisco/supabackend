import { Highlight, themes, type Language } from 'prism-react-renderer'
import type { CodeLanguage } from '../../codegen'

const LANG_MAP: Record<CodeLanguage, Language> = {
  typescript: 'tsx',
  prisma: 'typescript',
  yaml: 'yaml',
  json: 'json',
  markdown: 'markdown',
  bash: 'bash',
  text: 'markup',
}

type Props = {
  code: string
  language: CodeLanguage
  showLineNumbers?: boolean
  highlightLines?: Array<{ start: number; end: number; onClick?: () => void; title?: string }>
  maxHeight?: number | string
}

export function CodeView({
  code,
  language,
  showLineNumbers = true,
  highlightLines,
  maxHeight = '100%',
}: Props) {
  const prismLang = LANG_MAP[language] ?? 'markup'
  const rangeFor = (lineNumber: number) =>
    highlightLines?.find((r) => lineNumber >= r.start && lineNumber <= r.end)

  return (
    <Highlight theme={themes.nightOwl} code={code.replace(/\n$/, '')} language={prismLang}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          style={{
            ...style,
            margin: 0,
            padding: '16px 12px',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
            fontSize: 12.5,
            lineHeight: 1.6,
            overflow: 'auto',
            maxHeight,
            height: '100%',
            borderRadius: 0,
            tabSize: 2,
          }}
        >
          {tokens.map((line, i) => {
            const lineNumber = i + 1
            const range = rangeFor(lineNumber)
            const isClickable = !!range?.onClick
            const lineProps = getLineProps({ line })
            return (
              <div
                key={i}
                {...lineProps}
                onClick={range?.onClick}
                title={range?.title}
                style={{
                  ...lineProps.style,
                  display: 'flex',
                  cursor: isClickable ? 'pointer' : 'default',
                  background: range ? 'rgba(109,40,217,0.18)' : 'transparent',
                  borderLeft: range ? '2px solid #a78bfa' : '2px solid transparent',
                  paddingLeft: 6,
                  transition: 'background 120ms',
                }}
              >
                {showLineNumbers ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 36,
                      color: '#415a77',
                      textAlign: 'right',
                      paddingRight: 12,
                      userSelect: 'none',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {lineNumber}
                  </span>
                ) : null}
                <span style={{ flex: 1, whiteSpace: 'pre' }}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            )
          })}
        </pre>
      )}
    </Highlight>
  )
}
