-- Lista de espera da Toca da Madalena: novo valor de origem em public.leads.
-- A restrição já havia sido ampliada direto no banco (home_lead_form, diagnostico, contato);
-- aqui ela passa a constar no repositório com o valor novo. Só amplia a lista, não remove nada.

alter table public.leads drop constraint leads_origem_check;
alter table public.leads add constraint leads_origem_check
  check (origem in ('banner', 'simulador', 'home_lead_form', 'diagnostico', 'contato', 'toca_lista_espera'));
