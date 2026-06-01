import { useI18n } from '../../../../i18n/i18nContext';

interface BrowserViewPanelProps {
  url: string | null;
}

export function BrowserViewPanel({ url }: BrowserViewPanelProps) {
  const { t } = useI18n();

  if (!url) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-text-secondary text-sm">{t.browserView?.noUrl || 'No URL loaded'}</p>
          <p className="text-text-secondary text-xs mt-1">
            {t.browserView?.selectTarget || 'Select a web target and choose "Open in BrowserView"'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background">
      {/* @ts-ignore webview is an Electron-specific element */}
      <webview
        src={url}
        className="h-full w-full"
        // @ts-ignore
        allowpopups="false"
      />
    </div>
  );
}