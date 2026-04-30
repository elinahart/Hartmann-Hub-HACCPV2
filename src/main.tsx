import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider, EquipeProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { InventaireProvider } from './providers/InventaireProvider';
import { CatalogueProvider } from './providers/CatalogueProvider';
import { NettoyageProvider } from './providers/NettoyageProvider';
import { TemperaturesProvider } from './providers/TemperaturesProvider';
import { HuilesProvider } from './providers/HuilesProvider';
import { I18nProvider } from './lib/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ConfigProvider>
        <CatalogueProvider>
          <NettoyageProvider>
            <TemperaturesProvider>
              <HuilesProvider>
                <AuthProvider>
                  <InventaireProvider>
                    <App />
                  </InventaireProvider>
                </AuthProvider>
              </HuilesProvider>
            </TemperaturesProvider>
          </NettoyageProvider>
        </CatalogueProvider>
      </ConfigProvider>
    </I18nProvider>
  </StrictMode>,
);
