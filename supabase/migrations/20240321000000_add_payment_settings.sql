-- Migration: Add payment methods configuration to settings
INSERT INTO settings (key, value) VALUES 
('payment_methods', '{
  "credit_card": {
    "active": true,
    "success_message": "Seu pagamento foi aprovado com sucesso! Em breve você receberá um e-mail com os detalhes do envio."
  },
  "pix": {
    "active": true,
    "key": "00020126360014BR.GOV.BCB.PIX0114contato@mareviva.com.br5204000053039865404189.905802BR5920Mare Viva E-commerce6009SAO PAULO62070503***6304E2B1",
    "beneficiary": "Maré Viva E-commerce",
    "instructions": "Abra o app do seu banco e escolha a opção PIX > Ler QR Code ou Copia e Cola. O pagamento é aprovado instantaneamente."
  },
  "boleto": {
    "active": true,
    "line": "00190.00009 02652.450008 28901.610008 1 96730000018990",
    "instructions": "O boleto vence em 3 dias úteis. Você pode pagar em qualquer banco ou casa lotérica. A compensação pode levar até 2 dias úteis.",
    "expiry_days": 3
  }
}') ON CONFLICT (key) DO NOTHING;
