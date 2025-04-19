import React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Define the MIFID type
export type MifidType = {
  id: string;
  clientId: number;
  createdAt: string;
  updatedAt: string;
  address: string;
  phone: string;
  birthDate: string;
  maritalStatus: string;
  employmentStatus: string;
  educationLevel: string;
  annualIncome: number;
  monthlyExpenses: number;
  debts: number;
  dependents: number;
  assets: any[];
  investmentHorizon: string;
  retirementInterest: number;
  wealthGrowthInterest: number;
  incomeGenerationInterest: number;
  capitalPreservationInterest: number;
  estatePlanningInterest: number;
  investmentExperience: string;
  pastInvestmentExperience: string[];
  financialEducation: string[];
  riskProfile: string;
  portfolioDropReaction: string;
  volatilityTolerance: string;
  yearsOfExperience: string;
  investmentFrequency: string;
  advisorUsage: string;
  monitoringTime: string;
  specificQuestions: string | null;
};

// Form schema per la modifica dei dati MIFID
const mifidFormSchema = z.object({
  // Personal Information
  address: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().optional(),
  employmentStatus: z.string().optional(),
  educationLevel: z.string().optional(),
  
  // Financial Situation
  annualIncome: z.number().optional(),
  monthlyExpenses: z.number().optional(),
  debts: z.number().optional(),
  dependents: z.number().optional(),
  
  // Investment Profile
  riskProfile: z.string().optional(),
  investmentHorizon: z.string().optional(),
  
  // Investment Goals
  retirementInterest: z.number().optional(),
  wealthGrowthInterest: z.number().optional(),
  incomeGenerationInterest: z.number().optional(),
  capitalPreservationInterest: z.number().optional(),
  estatePlanningInterest: z.number().optional(),
  
  // Investment Experience
  investmentExperience: z.string().optional(),
  pastInvestmentExperience: z.array(z.string()).optional(),
  financialEducation: z.array(z.string()).optional(),
  portfolioDropReaction: z.string().optional(),
  volatilityTolerance: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  investmentFrequency: z.string().optional(),
  advisorUsage: z.string().optional(),
  monitoringTime: z.string().optional(),
  specificQuestions: z.string().optional(),
});

export type MifidFormValues = z.infer<typeof mifidFormSchema>;

interface MifidEditFormProps {
  mifid: MifidType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MifidFormValues) => void;
  isPending: boolean;
}

/**
 * Componente per modificare i dati MIFID di un cliente
 */
export function MifidEditForm({ 
  mifid, 
  open, 
  onOpenChange, 
  onSubmit,
  isPending 
}: MifidEditFormProps) {
  const { t } = useTranslation();

  // Form per la modifica dei dati MIFID
  const form = useForm<MifidFormValues>({
    resolver: zodResolver(mifidFormSchema),
    defaultValues: {
      // Personal Information
      address: mifid?.address || "",
      phone: mifid?.phone || "",
      birthDate: mifid?.birthDate || "",
      maritalStatus: mifid?.maritalStatus || "",
      employmentStatus: mifid?.employmentStatus || "",
      educationLevel: mifid?.educationLevel || "",
      
      // Financial Situation
      annualIncome: mifid?.annualIncome || 0,
      monthlyExpenses: mifid?.monthlyExpenses || 0,
      debts: mifid?.debts || 0,
      dependents: mifid?.dependents || 0,
      
      // Investment Profile
      riskProfile: mifid?.riskProfile || "",
      investmentHorizon: mifid?.investmentHorizon || "",
      
      // Investment Goals
      retirementInterest: mifid?.retirementInterest || 0,
      wealthGrowthInterest: mifid?.wealthGrowthInterest || 0,
      incomeGenerationInterest: mifid?.incomeGenerationInterest || 0,
      capitalPreservationInterest: mifid?.capitalPreservationInterest || 0,
      estatePlanningInterest: mifid?.estatePlanningInterest || 0,
      
      // Investment Experience
      investmentExperience: mifid?.investmentExperience || "",
      pastInvestmentExperience: mifid?.pastInvestmentExperience || [],
      financialEducation: mifid?.financialEducation || [],
      portfolioDropReaction: mifid?.portfolioDropReaction || "",
      volatilityTolerance: mifid?.volatilityTolerance || "",
      yearsOfExperience: mifid?.yearsOfExperience || "",
      investmentFrequency: mifid?.investmentFrequency || "",
      advisorUsage: mifid?.advisorUsage || "",
      monitoringTime: mifid?.monitoringTime || "",
      specificQuestions: mifid?.specificQuestions || "",
    },
  });

  // Update form values when MIFID data changes
  React.useEffect(() => {
    if (mifid) {
      form.reset({
        // Personal Information
        address: mifid.address || "",
        phone: mifid.phone || "",
        birthDate: mifid.birthDate || "",
        maritalStatus: mifid.maritalStatus || "",
        employmentStatus: mifid.employmentStatus || "",
        educationLevel: mifid.educationLevel || "",
        
        // Financial Situation
        annualIncome: mifid.annualIncome || 0,
        monthlyExpenses: mifid.monthlyExpenses || 0,
        debts: mifid.debts || 0,
        dependents: mifid.dependents || 0,
        
        // Investment Profile
        riskProfile: mifid.riskProfile || "",
        investmentHorizon: mifid.investmentHorizon || "",
        
        // Investment Goals
        retirementInterest: mifid.retirementInterest || 0,
        wealthGrowthInterest: mifid.wealthGrowthInterest || 0,
        incomeGenerationInterest: mifid.incomeGenerationInterest || 0,
        capitalPreservationInterest: mifid.capitalPreservationInterest || 0,
        estatePlanningInterest: mifid.estatePlanningInterest || 0,
        
        // Investment Experience
        investmentExperience: mifid.investmentExperience || "",
        pastInvestmentExperience: mifid.pastInvestmentExperience || [],
        financialEducation: mifid.financialEducation || [],
        portfolioDropReaction: mifid.portfolioDropReaction || "",
        volatilityTolerance: mifid.volatilityTolerance || "",
        yearsOfExperience: mifid.yearsOfExperience || "",
        investmentFrequency: mifid.investmentFrequency || "",
        advisorUsage: mifid.advisorUsage || "",
        monitoringTime: mifid.monitoringTime || "",
        specificQuestions: mifid.specificQuestions || "",
      });
    }
  }, [mifid, form]);

  const handleSubmit = (data: MifidFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('client.edit_mifid_data')}</DialogTitle>
          <DialogDescription>
            {t('client.edit_mifid_description')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.personal_info')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">{t('client.address')}</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('client.phone')}</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">{t('client.birth_date')}</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    {...form.register("birthDate")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">{t('client.marital_status')}</Label>
                  <Select 
                    value={form.watch("maritalStatus")} 
                    onValueChange={(value) => form.setValue("maritalStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_marital_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t('marital_status.single')}</SelectItem>
                      <SelectItem value="married">{t('marital_status.married')}</SelectItem>
                      <SelectItem value="divorced">{t('marital_status.divorced')}</SelectItem>
                      <SelectItem value="widowed">{t('marital_status.widowed')}</SelectItem>
                      <SelectItem value="separated">{t('marital_status.separated')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">{t('client.employment_status')}</Label>
                  <Select 
                    value={form.watch("employmentStatus")} 
                    onValueChange={(value) => form.setValue("employmentStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_employment_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">{t('employment_status.employed')}</SelectItem>
                      <SelectItem value="unemployed">{t('employment_status.unemployed')}</SelectItem>
                      <SelectItem value="self_employed">{t('employment_status.self_employed')}</SelectItem>
                      <SelectItem value="retired">{t('employment_status.retired')}</SelectItem>
                      <SelectItem value="student">{t('employment_status.student')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="educationLevel">{t('client.education_level')}</Label>
                  <Select 
                    value={form.watch("educationLevel")} 
                    onValueChange={(value) => form.setValue("educationLevel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_education_level')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">{t('education_levels.high_school')}</SelectItem>
                      <SelectItem value="bachelor">{t('education_levels.bachelor')}</SelectItem>
                      <SelectItem value="master">{t('education_levels.master')}</SelectItem>
                      <SelectItem value="phd">{t('education_levels.phd')}</SelectItem>
                      <SelectItem value="other">{t('education_levels.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Financial Situation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.current_financial_situation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualIncome">{t('client.annual_income')}</Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    {...form.register("annualIncome", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses">{t('client.monthly_expenses')}</Label>
                  <Input
                    id="monthlyExpenses"
                    type="number"
                    {...form.register("monthlyExpenses", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debts">{t('client.debts')}</Label>
                  <Input
                    id="debts"
                    type="number"
                    {...form.register("debts", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dependents">{t('client.dependents')}</Label>
                  <Input
                    id="dependents"
                    type="number"
                    {...form.register("dependents", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Investment Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.investment_profile')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riskProfile">{t('client.risk_profile')}</Label>
                  <Select 
                    value={form.watch("riskProfile")} 
                    onValueChange={(value) => form.setValue("riskProfile", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_risk_profile')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">{t('risk_profiles.conservative')}</SelectItem>
                      <SelectItem value="moderate">{t('risk_profiles.moderate')}</SelectItem>
                      <SelectItem value="balanced">{t('risk_profiles.balanced')}</SelectItem>
                      <SelectItem value="growth">{t('risk_profiles.growth')}</SelectItem>
                      <SelectItem value="aggressive">{t('risk_profiles.aggressive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investmentHorizon">{t('client.investment_horizon')}</Label>
                  <Select 
                    value={form.watch("investmentHorizon")} 
                    onValueChange={(value) => form.setValue("investmentHorizon", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_investment_horizon')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">{t('investment_horizons.short_term')}</SelectItem>
                      <SelectItem value="medium_term">{t('investment_horizons.medium_term')}</SelectItem>
                      <SelectItem value="long_term">{t('investment_horizons.long_term')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Investment Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('client.investment_experience')}</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="investmentExperience">{t('client.investment_experience_level')}</Label>
                  <Select 
                    value={form.watch("investmentExperience")} 
                    onValueChange={(value) => form.setValue("investmentExperience", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('client.select_investment_experience')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('investment_experience.none')}</SelectItem>
                      <SelectItem value="limited">{t('investment_experience.limited')}</SelectItem>
                      <SelectItem value="good">{t('investment_experience.good')}</SelectItem>
                      <SelectItem value="extensive">{t('investment_experience.extensive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('client.past_investment_experience')}</Label>
                  <div className="space-y-2">
                    {['stocks', 'bonds', 'mutual_funds', 'etfs', 'real_estate', 'crypto'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={form.watch("pastInvestmentExperience")?.includes(type)}
                          onChange={(e) => {
                            const current = form.watch("pastInvestmentExperience") || [];
                            if (e.target.checked) {
                              form.setValue("pastInvestmentExperience", [...current, type]);
                            } else {
                              form.setValue("pastInvestmentExperience", current.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={type}>{t(`investment_types.${type}`)}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('client.financial_education')}</Label>
                  <div className="space-y-2">
                    {['courses', 'books', 'seminars', 'online_resources', 'professional_advice'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={form.watch("financialEducation")?.includes(type)}
                          onChange={(e) => {
                            const current = form.watch("financialEducation") || [];
                            if (e.target.checked) {
                              form.setValue("financialEducation", [...current, type]);
                            } else {
                              form.setValue("financialEducation", current.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={type}>{t(`education_types.${type}`)}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specificQuestions">{t('client.specific_questions')}</Label>
                  <Textarea
                    id="specificQuestions"
                    {...form.register("specificQuestions")}
                    placeholder={t('client.specific_questions_placeholder')}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 