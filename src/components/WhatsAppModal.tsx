import { useState } from 'react';
import Modal from './Modal';
import { MessageCircle } from 'lucide-react';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Ouvrir WhatsApp" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Indicatif pays</label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            {countryCodes.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Numéro de téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="77 123 45 67"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-gray-500"
          />
        </div>

        <div className="text-xs text-gray-500">
          Numéro complet : {countryCode} {phone}
        </div>

        <button
          onClick={handleOpen}
          disabled={!phone.trim()}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 transition"
        >
          <MessageCircle className="w-4 h-4" />
          Ouvrir WhatsApp
        </button>
      </div>
    </Modal>
  );
}
