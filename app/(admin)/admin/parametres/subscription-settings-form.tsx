'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updatePlatformSettingsAction, updateSubscriptionPlanAction } from './actions';
import { toast } from '@/stores/toast';
import type { PlatformSettings, SubscriptionPlan } from '@/types/database';

function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (error)
    return (
      <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  if (success)
    return (
      <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
        ✓ {success}
      </p>
    );
  return null;
}

export function SubscriptionSettingsForms({
  settings,
  plans,
}: {
  settings: PlatformSettings;
  plans: SubscriptionPlan[];
}) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <PlansForm plans={plans} onDone={() => router.refresh()} />
      <GeneralForm settings={settings} onDone={() => router.refresh()} />
    </div>
  );
}

function PlansForm({ plans, onDone }: { plans: SubscriptionPlan[]; onDone: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-card md:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold">Offres & prix</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Prix mensuels des trois offres. Laissez « livreurs » vide pour illimité.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onDone={onDone} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, onDone }: { plan: SubscriptionPlan; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(null);
          fd.set('id', plan.id);
          const res = await updateSubscriptionPlanAction(fd);
          if (res.ok) {
            setSuccess('Enregistré');
            toast.success(res.success ?? 'Offre enregistrée ✓');
            onDone();
          } else {
            setError(res.error ?? 'Erreur.');
            toast.error(res.error ?? 'Erreur.');
          }
        })
      }
      className="space-y-3 rounded-xl border border-border p-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`name-${plan.id}`} className="text-xs">
          Nom
        </Label>
        <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} required maxLength={60} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`price-${plan.id}`} className="text-xs">
          Prix mensuel (DA)
        </Label>
        <Input
          id={`price-${plan.id}`}
          name="monthly_price"
          type="number"
          min={0}
          step={100}
          defaultValue={plan.monthly_price}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`limit-${plan.id}`} className="text-xs">
          Livreurs (vide = illimité)
        </Label>
        <Input
          id={`limit-${plan.id}`}
          name="driver_limit"
          type="number"
          min={0}
          placeholder="illimité"
          defaultValue={plan.driver_limit ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`desc-${plan.id}`} className="text-xs">
          Description
        </Label>
        <Input
          id={`desc-${plan.id}`}
          name="description"
          defaultValue={plan.description}
          maxLength={120}
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="is_active" defaultChecked={plan.is_active} className="h-4 w-4" />
        Offre visible
      </label>
      <Feedback error={error} success={success} />
      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending ? '…' : 'Enregistrer'}
      </Button>
    </form>
  );
}

function GeneralForm({ settings, onDone }: { settings: PlatformSettings; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-card md:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Percent className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold">Essai, remises & paiement</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Durée de l’essai gratuit, remises pour engagement, et coordonnées de paiement affichées aux
        restaurateurs.
      </p>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            setSuccess(null);
            const res = await updatePlatformSettingsAction(fd);
            if (res.ok) {
              setSuccess(res.success ?? 'Enregistré.');
              toast.success(res.success ?? 'Enregistré ✓');
              onDone();
            } else {
              setError(res.error ?? 'Erreur.');
              toast.error(res.error ?? 'Erreur.');
            }
          })
        }
        className="mt-4 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="trial_days" className="text-xs">
              Jours d’essai gratuit
            </Label>
            <Input id="trial_days" name="trial_days" type="number" min={0} max={365} defaultValue={settings.trial_days} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discount_6m_percent" className="text-xs">
              Remise 6 mois (%)
            </Label>
            <Input id="discount_6m_percent" name="discount_6m_percent" type="number" min={0} max={100} defaultValue={settings.discount_6m_percent} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discount_12m_percent" className="text-xs">
              Remise 12 mois (%)
            </Label>
            <Input id="discount_12m_percent" name="discount_12m_percent" type="number" min={0} max={100} defaultValue={settings.discount_12m_percent} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_number" className="text-xs">
              Numéro WhatsApp (paiement)
            </Label>
            <Input
              id="whatsapp_number"
              name="whatsapp_number"
              defaultValue={settings.whatsapp_number}
              placeholder="33xxxxxxxxx"
              maxLength={30}
            />
            <p className="text-[11px] text-muted-foreground">
              Numéro français, format international, ex : 33612345678
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccp_number" className="text-xs">
              Numéro CCP
            </Label>
            <Input id="ccp_number" name="ccp_number" defaultValue={settings.ccp_number} placeholder="0012345678" maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccp_name" className="text-xs">
              Titulaire du compte
            </Label>
            <Input id="ccp_name" name="ccp_name" defaultValue={settings.ccp_name} placeholder="Nom Prénom" maxLength={120} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment_note" className="text-xs">
            Consigne de paiement (optionnel)
          </Label>
          <Textarea
            id="payment_note"
            name="payment_note"
            defaultValue={settings.payment_note}
            maxLength={500}
            placeholder="Ex : Mentionnez le nom de votre restaurant dans le motif du virement."
          />
        </div>

        <Feedback error={error} success={success} />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </div>
  );
}
