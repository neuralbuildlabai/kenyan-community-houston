import { useState } from 'react'
import {
  BIG_FIVE_CERTIFICATE_BG_PATH,
  getBigFiveCertificateBgPath,
} from '@/lib/certificateTemplates'

type BigFiveWildlifeBackgroundProps = {
  templateId: string
}

/**
 * Big 5 safari scene for KIGH certificate lower-half background.
 * Uses real image assets — no SVG blobs or placeholder silhouettes.
 */
export function BigFiveWildlifeBackground({ templateId }: BigFiveWildlifeBackgroundProps) {
  const [failed, setFailed] = useState(false)
  const src = getBigFiveCertificateBgPath(templateId)

  if (failed) return null

  return (
    <div className="cert-wildlife-zone" aria-hidden>
      <div className="cert-wildlife-bg">
        <img
          src={src}
          alt=""
          className="cert-wildlife-img"
          crossOrigin="anonymous"
          loading="eager"
          decoding="sync"
          onError={() => {
            if (import.meta.env.DEV) {
              console.warn(`Big Five certificate background asset missing: ${src || BIG_FIVE_CERTIFICATE_BG_PATH}`)
            }
            setFailed(true)
          }}
        />
      </div>
    </div>
  )
}
