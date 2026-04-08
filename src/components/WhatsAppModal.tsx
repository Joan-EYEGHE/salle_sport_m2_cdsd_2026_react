import { useState } from 'react';
import Modal from './Modal';
import { MessageCircle, Phone } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
}

const countryCodes = [
  { code: '+221', label: '🇸🇳 Sénégal (+221)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
  { code: '+1', label: '🇺🇸 USA (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
  { code: '+225', label: '🇨🇮 Côte d\'Ivoire (+225)' },
  { code: '+223', label: '🇲🇱 Mali (+223)' },
  { code: '+224', label: '🇬🇳 Guinée (+224)' },
  { code: '+229', label: '🇧🇯 Bénin (+229)' },
  { code: '+226', label: '🇧🇫 Burkina Faso (+226)' },
  { code: '+228', label: '🇹🇬 Togo (+228)' },
];

export default function WhatsAppModal({ isOpen, onClose, defaultPhone = '' }: WhatsAppModalProps) {
  const [countryCode, setCountryCode] = useState('+221');
  const [phone, setPhone] = useState(defaultPhone);

  const handleOpen = () => {
    const digits = phone.replace(/\D/g, '');
    const fullNumber = countryCode.replace('+', '') + digits;
    window.open(`https://wa.me/${fullNumber}`, '_blank');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Envoyer via WhatsApp" size="sm">
      <div className="space-y-4">
        {/* Phone input */}
        <div>
          <label className="block text-sm text-gray-500 font-medium mb-1.5">Téléphone du client</label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+22177XXXXXXX"
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Inclure l'indicatif du pays (par exemple, +221 pour le Sénégal)
          </p>
        </div>

        {/* WhatsApp info block */}
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <MessageCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700 leading-relaxed">
            Les détails du billet seront envoyés directement à ce numéro via WhatsApp.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleOpen}
            disabled={!phone.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            <MessageCircle className="w-4 h-4" />
            Envoyer
          </button>
        </div>
      </div>
    </Modal>
  );
}
