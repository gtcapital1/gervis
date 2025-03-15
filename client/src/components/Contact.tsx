import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { httpRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const createContactFormSchema = (t: any) => z.object({
  firstName: z.string().min(1, t('contact.validation.firstName')),
  lastName: z.string().min(1, t('contact.validation.lastName')),
  email: z.string().email(t('contact.validation.email')),
  company: z.string().optional(),
  message: z.string().min(1, t('contact.validation.message')),
  privacy: z.boolean().refine(val => val === true, {
    message: t('contact.validation.privacy')
  })
});

export default function Contact() {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  
  const contactFormSchema = createContactFormSchema(t);
  type ContactFormValues = z.infer<typeof contactFormSchema>;
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      message: "",
      privacy: false
    }
  });

  async function onSubmit(data: ContactFormValues) {
    try {
      await httpRequest("POST", "/api/contact", data);
      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Error",
        description: t('contact.error'),
        variant: "destructive"
      });
      console.error("Contact form submission error:", error);
    }
  }

  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">{t('contact.title')}</h2>
          <p className="text-lg text-gray-600">
            {t('contact.subtitle')}
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('contact.form.success')}</h3>
              <p className="text-gray-600">{t('contact.form.success_message')}</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contact.form.firstName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('contact.form.placeholders.firstName')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contact.form.lastName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('contact.form.placeholders.lastName')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contact.form.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('contact.form.placeholders.email')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contact.form.company')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('contact.form.placeholders.company')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contact.form.message')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('contact.form.placeholders.message')}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="privacy"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="privacy"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('contact.form.privacy')}
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white py-6 font-medium"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? t('contact.form.submitting') : t('contact.form.submit')}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>
    </section>
  );
}
