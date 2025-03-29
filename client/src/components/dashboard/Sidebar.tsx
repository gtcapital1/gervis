import {
  UsersIcon,
  CalendarIcon,
  ActivityIcon,
} from "lucide-react";

<NavItem icon={UsersIcon} href="/clients">
  {t('dashboard.clients')}
</NavItem>
<NavItem icon={CalendarIcon} href="/calendar">
  {t('dashboard.calendar')}
</NavItem>
<NavItem icon={ActivityIcon} href="/client-logs">
  {t('dashboard.activity_logs')}
</NavItem> 