import Link from 'next/link';
import { Activity, Stethoscope, Users, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/20">
      {/* Header */}
      <header className="px-5 lg:px-12 h-[72px] flex items-center border-b sticky top-0 bg-background/90 backdrop-blur-xl z-50 transition-all">
        <Link className="flex items-center justify-center gap-3 group" href="/">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter leading-none">ClinicOS</span>
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-primary">Intelligence</span>
          </div>
        </Link>
        <nav className="ms-auto hidden md:flex items-center gap-10">
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors" href="#features">الميزات</Link>
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors" href="#stats">إحصائيات</Link>
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors" href="/login" prefetch={true}>تسجيل الدخول</Link>
          <Button className="rounded-xl px-8 h-11 font-bold shadow-lg shadow-primary/20" asChild>
            <Link href="/register" prefetch={true}>ابدأ الآن</Link>
          </Button>
        </nav>
        <Button variant="ghost" size="icon" className="md:hidden ms-auto">
          <Activity className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative w-full py-14 sm:py-[72px] lg:py-24 px-5 overflow-hidden">
          <div className="container mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/10 text-primary px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              تم إطلاق الإصدار 2.0 الجديد كلياً
            </div>
            
            <h1 className="text-4xl font-black sm:text-6xl lg:text-7xl max-w-5xl mx-auto leading-[1.05]">
              حوّل عيادتك إلى نظام <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] animate-gradient-flow">ذكي ومتكامل</span>
            </h1>

            <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg lg:text-xl leading-relaxed font-medium">
              نظام ClinicOS يمنحك السيطرة الكاملة على عيادتك عبر أدوات متطورة لإدارة المواعيد، السجلات الطبية، والتقارير المالية في منصة واحدة آمنة.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button size="lg" className="h-14 px-9 rounded-xl text-base sm:text-lg font-bold gap-3 shadow-xl shadow-primary/20 group" asChild>
                <Link href="/register" prefetch={true}>
                  ابدأ تجربتك المجانية 
                  <ArrowLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-9 rounded-xl text-base sm:text-lg font-bold bg-background/70 backdrop-blur-sm border-muted-foreground/20" asChild>
                <Link href="/login" prefetch={true}>تسجيل الدخول</Link>
              </Button>
            </div>
            
            {/* Social Proof */}
            <div className="pt-8 lg:pt-12 space-y-6">
              <p className="text-xs font-black text-muted-foreground/40 uppercase tracking-[0.4em]">تثق بنا أكبر المؤسسات الطبية</p>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                {['المستشفى السعودي', 'مجمع الشفاء', 'عيادات الحياة', 'مركز النور', 'مجموعة العبير'].map(name => (
                  <div key={name} className="font-black text-lg sm:text-xl tracking-tight text-foreground">{name}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 lg:py-24 bg-muted/20 px-5 relative">
          <div className="container mx-auto">
            <div className="text-center mb-14 space-y-4">
              <h2 className="text-3xl font-black sm:text-5xl tracking-tight">قوة التكنولوجيا بين يديك</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">كل أداة تحتاجها لإدارة ممارستك الطبية تم بناؤها بعناية فائقة لتوفير تجربة مستخدم لا مثيل لها.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { icon: Calendar, title: 'جدولة ذكية للمواعيد', desc: 'نظام حجز متقدم يدعم التنبيهات التلقائية، تتبع حالات الحضور، وإدارة غرف الانتظار بكفاءة.' },
                { icon: Stethoscope, title: 'سجلات طبية مشفرة', desc: 'تاريخ طبي شامل لكل مريض مع إمكانية إرفاق التحاليل والأشعة وحفظ الوصفات الإلكترونية.' },
                { icon: Users, title: 'إدارة الكادر الطبي', desc: 'تحكم كامل في صلاحيات الأطباء والموظفين، مع تقارير أداء تفصيلية لكل فرد في عيادتك.' }
              ].map((f, i) => (
                <div key={i} className="group relative bg-background p-8 rounded-2xl border border-muted-foreground/10 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center text-primary mb-8 transition-transform group-hover:rotate-6 duration-500">
                    <f.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tight">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-base">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="stats" className="w-full py-20 lg:py-24 px-5">
          <div className="container mx-auto bg-primary rounded-2xl p-10 lg:p-20 relative overflow-hidden shadow-2xl shadow-primary/25">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative z-10">
              {[
                { val: '10K+', label: 'مريض مسجل' },
                { val: '500+', label: 'عيادة نشطة' },
                { val: '250K', label: 'موعد مكتمل' },
                { val: '99.9%', label: 'وقت التشغيل' }
              ].map((s, i) => (
                <div key={i} className="text-center space-y-3">
                  <p className="text-5xl lg:text-7xl font-black text-white tracking-tighter">{s.val}</p>
                  <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-20 px-6 bg-muted/30">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 lg:gap-24">
          <div className="md:col-span-2 space-y-8">
            <Link className="flex items-center gap-3" href="/">
              <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-black text-2xl tracking-tighter">ClinicOS</span>
            </Link>
            <p className="text-lg text-muted-foreground max-w-sm font-medium leading-relaxed">
              الخيار الأول لإدارة المؤسسات الطبية في العالم العربي. تميز بالبساطة، السرعة، والأمان.
            </p>
            <div className="flex gap-4">
              {/* Social icons placeholder */}
              {[1,2,3,4].map(i => <div key={i} className="h-10 w-10 rounded-full bg-muted border border-muted-foreground/10" />)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-12 md:col-span-2">
            <div className="space-y-6">
              <p className="font-black text-sm uppercase tracking-[0.2em] text-primary">المنصة</p>
              <nav className="flex flex-col gap-4">
                {['الميزات', 'الأسعار', 'دليل الاستخدام', 'التحديثات'].map(item => (
                  <Link key={item} href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">{item}</Link>
                ))}
              </nav>
            </div>
            <div className="space-y-6">
              <p className="font-black text-sm uppercase tracking-[0.2em] text-primary">القانونية</p>
              <nav className="flex flex-col gap-4">
                {['سياسة الخصوصية', 'شروط الاستخدام', 'اتفاقية الخدمة', 'اتصل بنا'].map(item => (
                  <Link key={item} href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">{item}</Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="container mx-auto mt-20 pt-10 border-t border-muted-foreground/10 text-center">
          <p className="text-sm font-bold text-muted-foreground/50 tracking-tight">
            © {new Date().getFullYear()} ClinicOS Intelligence Systems. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
