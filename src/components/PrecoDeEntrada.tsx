import { Tag } from "lucide-react";
import { precoDeEntrada, type Pacote } from "@/lib/pricing";

/**
 * Faixa de preço de um pacote, para publicar ao lado da prova.
 *
 * Existe como componente próprio porque o mesmo bloco atende dois lugares com
 * leituras opostas: na página de cases o preço vem depois do projeto ("isto
 * custa tanto"), e numa futura página de preços o projeto vem depois do preço
 * ("por tanto, isto"). O dado e a regra de desconto são os mesmos, e ficam em
 * `lib/pricing.ts` — aqui é só apresentação.
 *
 * ⚠️ **O valor cheio riscado só aparece quando existe promoção ativa de
 * verdade.** `precoDeEntrada` devolve `cheio: null` fora da promoção e nos
 * pacotes sem teto, e o riscado some junto. Preço de referência que nunca foi
 * praticado é publicidade enganosa, não recurso de layout — por isso a decisão
 * de mostrar ou não o riscado é do `pricing.ts` e não deste arquivo.
 */
export function PrecoDeEntrada({ pacote }: { pacote: Pacote }) {
  const preco = precoDeEntrada(pacote);

  return (
    <div className="border-t border-border bg-muted/50 px-6 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Pacote {pacote.nome}
        </span>
        <p className="text-lg font-black text-brand-navy-deep">{preco.valor}</p>
        {preco.cheio && (
          <p className="text-sm text-muted-foreground">
            {/* O rótulo é lido em voz alta; sem ele o leitor de tela anuncia dois
                valores seguidos sem dizer qual está valendo. */}
            <span className="sr-only">Preço normal: </span>
            <s>{preco.cheio}</s>
          </p>
        )}
      </div>

      {preco.ate && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-green-text">
          <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Preço de lançamento, até {preco.ate}
        </p>
      )}
    </div>
  );
}
