import * as ReactQrModule from 'react-qr-code'

/**
 * react-qr-code is CJS-only. Production bundlers may expose the module object
 * instead of the component (React error #130: got object).
 */
const AssetQrCode =
  ReactQrModule.default ??
  ReactQrModule.QRCode ??
  (typeof ReactQrModule === 'function' ? ReactQrModule : null)

export default AssetQrCode
