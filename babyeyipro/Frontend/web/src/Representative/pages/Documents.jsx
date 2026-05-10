import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { FolderOpen, FileText } from 'lucide-react';

export default function RepresentativeDocuments() {
  return (
    <RepresentativeHeroShell
      eyebrow="Document & report center"
      title="Documents"
      subtitle="Certificates, financials, inspection packs, contracts, student files, and government exports."
      HeroIcon={FolderOpen}
      kpiTiles={[
        { key: 't', label: 'Templates', value: '64', icon: FileText },
        { key: 'd', label: 'Downloads (30d)', value: '2,180', icon: FolderOpen },
        { key: 'g', label: 'Gov reports ready', value: '12', icon: FileText },
        { key: 'p', label: 'Pending signatures', value: '7', icon: FolderOpen },
      ]}
      pageBody={
        <>
          <RepSection title="Export formats">
            <RepCardGrid>
              <RepStatCard label="PDF bundles" value="Primary format" hint="Watermarked official copies" />
              <RepStatCard label="Excel / CSV" value="Finance & roster" hint="Pivot-ready columns" />
              <RepStatCard label="MINEDUC XML (when enabled)" value="Staging" hint="Validate before submit" tone="warn" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Quick access">
            <RepListCard
              title="Pinned"
              rows={[
                { label: 'Annual financial statements', value: 'FY 2025 draft' },
                { label: 'Staff contracts (network)', value: 'Vault' },
                { label: 'Inspection evidence zip', value: 'Q1 pack' },
              ]}
            />
          </RepSection>
        </>
      }
    />
  );
}
