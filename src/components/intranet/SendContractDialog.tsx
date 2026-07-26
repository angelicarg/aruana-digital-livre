import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { sendContractForSignature, type SendContractResult } from "@/lib/api/signature.functions";
import type { DealWithClient } from "@/lib/intranet/deals";
import type { DocumentWithRelations } from "@/lib/intranet/documents";

// Encaixe da Autentique no fluxo de Fechar Negócio: o admin escolhe, entre
// os documentos já enviados na aba Documentos (categoria "Contrato") para
// o cliente deste negócio, qual mandar pra assinatura eletrônica. A
// assinatura em si acontece no e-mail/página hospedada da Autentique, não
// no nosso site — aqui só disparamos o envio e depois refletimos o status
// (ver signature.functions.ts + api.autentique-webhook.ts).

const REASON_MESSAGES: Record<Exclude<SendContractResult, { sent: true }>["reason"], string> = {
  not_admin: "Sessão expirada — faça login novamente.",
  not_configured: "Assinatura eletrônica ainda não configurada (fale com quem cuida do técnico).",
  deal_not_found: "Negócio não encontrado.",
  already_sent: "Este contrato já foi enviado ou assinado.",
  document_not_found: "Documento não encontrado.",
  file_download_failed: "Não foi possível ler o arquivo do documento.",
  autentique_error: "A Autentique recusou o envio — confira o arquivo e tente de novo.",
  save_failed: "Enviado, mas houve falha ao salvar o status. Confira a aba antes de reenviar.",
  unexpected_error: "Erro inesperado ao enviar. Tente novamente.",
};

export function SendContractDialog({
  open,
  onOpenChange,
  deal,
  contractDocuments,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealWithClient | null;
  contractDocuments: DocumentWithRelations[];
  onSent: () => void;
}) {
  const [documentId, setDocumentId] = useState("");
  const [signerEmail, setSignerEmail] = useState("");

  useEffect(() => {
    if (open && deal) {
      setDocumentId("");
      setSignerEmail(deal.intranet_clients?.email ?? "");
    }
  }, [open, deal]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("Nenhum negócio selecionado");
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada, faça login novamente.");

      return sendContractForSignature({
        data: { dealId: deal.id, documentId, signerEmail, accessToken },
      });
    },
    onSuccess: (result) => {
      if (result.sent) {
        toast.success("Contrato enviado para assinatura.");
        onOpenChange(false);
        onSent();
        return;
      }
      toast.error(REASON_MESSAGES[result.reason]);
    },
    onError: () => {
      toast.error("Não foi possível enviar o contrato.");
    },
  });

  if (!deal) return null;

  const canSubmit = documentId !== "" && signerEmail.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar contrato para assinatura</DialogTitle>
          <DialogDescription>
            {deal.intranet_clients?.name ?? "Cliente"} recebe um e-mail da Autentique com o link
            pra assinar. O status aqui atualiza sozinho quando ele assinar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {contractDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum documento na categoria "Contrato" foi enviado ainda pra este cliente. Faça
              upload primeiro na aba Documentos e volte aqui.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Documento (categoria Contrato)</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contractDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>E-mail do signatário</Label>
            <Input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "Enviando…" : "Enviar para assinatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
