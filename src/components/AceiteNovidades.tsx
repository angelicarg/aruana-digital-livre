// Começa desmarcada: a LGPD só aceita autorização dada pela própria pessoa.
export function AceiteNovidades({
  id,
  checked,
  onChange,
  name,
}: {
  id: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-muted-foreground">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-green"
      />
      <span>
        Quero receber novidades e ofertas da Aruanã Digital por e-mail. Posso sair da lista quando quiser.
      </span>
    </label>
  );
}
