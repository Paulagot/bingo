import React, { useState } from 'react';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqErrorBanner } from '../../components/shared/SqStateComponents';
import { AdminTabStrip } from './AdminDashboardPage';
import { EXPORT_FILES, downloadExport } from '../../api/sqAdminApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

export default function AdminExportsPage() {
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/admin-login');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(path: string, filename: string) {
    setDownloadingPath(path);
    setError(null);
    try {
      await downloadExport(path, filename);
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t download that file. Try again.');
    } finally {
      setDownloadingPath(null);
    }
  }

  return (
    <div className="sq-root sq-admin-page">
      <header className="sq-admin-header">
        <h1>Exports</h1>
        <p>Download squad data as CSV files.</p>
      </header>

      <AdminTabStrip active="/summer-quest/admin/exports" />

      {error && <SqErrorBanner message={error} />}

      <div className="sq-exports-list">
        {EXPORT_FILES.map((file) => (
          <SqCard key={file.path} className="sq-export-row">
            <span>{file.label}</span>
            <SqButton
              variant="ghost"
              disabled={downloadingPath === file.path}
              onClick={() => handleDownload(file.path, file.filename)}
            >
              {downloadingPath === file.path ? 'Downloading…' : 'Download CSV'}
            </SqButton>
          </SqCard>
        ))}
      </div>
    </div>
  );
}

export const SQ_ADMIN_EXPORTS_CSS = `
.sq-exports-list { display: flex; flex-direction: column; gap: 10px; }
.sq-export-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 700; font-size: 14px; }
`;
