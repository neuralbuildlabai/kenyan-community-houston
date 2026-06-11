import { useState } from 'react'
import {
  BIG_FIVE_CERTIFICATE_BG_PATH,
  getBigFiveCertificateBgPath,
  type CertificateDesignStyleId,
} from '@/lib/certificateTemplates'

type BigFiveWildlifeBackgroundProps = {
  designStyleId: CertificateDesignStyleId
}

/**
 * Big 5 safari scene for KIGH certificate lower-half background.
 * Uses real image assets — no SVG blobs or placeholder silhouettes.
 */
export function BigFiveWildlifeBackground({ designStyleId }: BigFiveWildlifeBackgroundProps) {
  const [failed, setFailed] = useState(false)
  const src = getBigFiveCertificateBgPath(designStyleId)

  if (failed) return null

  return (
    <div className="cert-wildlife-bg" aria-hidden>
      <img
        src={src}
        alt=""
        className="cert-wildlife-img"
        crossOrigin="anonymous"
        onError={() => {
          if (import.meta.env.DEV) {
            console.warn(`Big Five certificate background asset missing: ${src || BIG_FIVE_CERTIFICATE_BG_PATH}`)
          }
          setFailed(true)
        }}
      />
    </div>
  )
}
