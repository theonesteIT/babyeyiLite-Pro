import AddAsset2 from './AddAsset2'

/** Simplified 2-step add asset modal with auto depreciation engine. */
export default function AddAsset({ open, onClose, onSuccess }) {
  return <AddAsset2 open={open} onClose={onClose} onSuccess={onSuccess} />
}
