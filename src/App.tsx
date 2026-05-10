import { useState, useEffect } from 'react';
import './App.css';
import moment from 'moment-jalaali';
import { LocalNotifications } from '@capacitor/local-notifications';

moment.loadPersian({ dialect: 'persian-modern' });

const persianMonths: string[] = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const weekDays: string[] = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const years: number[] = [];
for (let i = 1390; i <= 1410; i++) {
  years.push(i);
}

const getMonthDays = (year: number, month: number): number => {
  if (month <= 5) return 31;
  if (month <= 10) return 30;
  const isLeap = moment(`${year}/1/1`, 'jYYYY/jM/jD').isLeapYear();
  return isLeap ? 30 : 29;
};

const getPrayerTimes = (day: number): any => {
  const times = {
    fajr: ['04:28', '04:26', '04:24', '04:22'],
    sunrise: ['06:00', '05:58', '05:56', '05:54'],
    dhuhr: ['12:00', '12:01', '12:02', '12:03'],
    asr: ['15:30', '15:31', '15:32', '15:33'],
    maghrib: ['18:00', '18:02', '18:04', '18:06'],
    isha: ['19:30', '19:32', '19:34', '19:36']
  };
  const index = Math.floor((day - 1) / 10);
  return {
    fajr: times.fajr[index],
    sunrise: times.sunrise[index],
    dhuhr: times.dhuhr[index],
    asr: times.asr[index],
    maghrib: times.maghrib[index],
    isha: times.isha[index]
  };
};

interface Transaction {
  id: string;
  title: string;
  amount: number;
  isPaid: boolean;
  reminderDateTime?: string; // ذخیره زمان یادآوری
  reminderScheduled?: boolean;
}

interface DayData {
  transactions: Transaction[];
}

// تابع فرمت عدد با جداکننده سه‌رقمی
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

// تابع تبدیل رشته با جداکننده به عدد
const parseFormattedNumber = (str: string): number => {
  const cleaned = str.replace(/,/g, '');
  return parseFloat(cleaned);
};

function App() {
  const [currentYear, setCurrentYear] = useState<number>(moment().jYear());
  const [currentMonth, setCurrentMonth] = useState<number>(moment().jMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showPrayerModal, setShowPrayerModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showYearMonthModal, setShowYearMonthModal] = useState<boolean>(false);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [calendarData, setCalendarData] = useState<{ [key: string]: DayData }>({});
  const [reportStart, setReportStart] = useState<string>('');
  const [reportEnd, setReportEnd] = useState<string>('');
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [tempYear, setTempYear] = useState<number>(currentYear);
  const [tempMonth, setTempMonth] = useState<number>(currentMonth);
  const [reminderText, setReminderText] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('09:00');
  const [selectedTransactionForReminder, setSelectedTransactionForReminder] = useState<{ dateKey: string; transactionId: string } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  // درخواست مجوز نوتیفیکیشن در شروع برنامه
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const { display } = await LocalNotifications.requestPermissions();
        if (display === 'granted') {
          setNotificationPermission(true);
          console.log('✅ مجوز نوتیفیکیشن دریافت شد');
        }
      } catch (error) {
        console.log('❌ خطا در دریافت مجوز:', error);
      }
    };
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('calendarData');
    if (saved) setCalendarData(JSON.parse(saved));
  }, []);

  const saveData = (data: any) => {
    localStorage.setItem('calendarData', JSON.stringify(data));
    setCalendarData(data);
  };

  const getKey = (y: number, m: number, d: number): string => `${y}-${m + 1}-${d}`;

  const getDayTransactions = (y: number, m: number, d: number): Transaction[] => {
    const day = calendarData[getKey(y, m, d)];
    return day?.transactions || [];
  };

  const getDayDebt = (y: number, m: number, d: number): number => {
    return getDayTransactions(y, m, d)
      .filter(t => !t.isPaid)
      .reduce((s, t) => s + t.amount, 0);
  };

  const getDayTotalTransactions = (y: number, m: number, d: number): number => {
    return getDayTransactions(y, m, d).reduce((s, t) => s + t.amount, 0);
  };

  const getDayPaid = (y: number, m: number, d: number): number => {
    return getDayTransactions(y, m, d)
      .filter(t => t.isPaid)
      .reduce((s, t) => s + t.amount, 0);
  };

  // جمع‌های ماه
  const getMonthTotal = (): number => {
    let total = 0;
    const days = getMonthDays(currentYear, currentMonth);
    for (let d = 1; d <= days; d++) {
      total += getDayTotalTransactions(currentYear, currentMonth, d);
    }
    return total;
  };

  const getMonthRemaining = (): number => {
    let remaining = 0;
    const days = getMonthDays(currentYear, currentMonth);
    for (let d = 1; d <= days; d++) {
      remaining += getDayDebt(currentYear, currentMonth, d);
    }
    return remaining;
  };

  const getMonthPaid = (): number => {
    let paid = 0;
    const days = getMonthDays(currentYear, currentMonth);
    for (let d = 1; d <= days; d++) {
      paid += getDayPaid(currentYear, currentMonth, d);
    }
    return paid;
  };

  // تابع ثبت یادآوری
  const scheduleReminder = async (transaction: Transaction, dateKey: string) => {
    if (!notificationPermission) {
      alert('لطفاً مجوز نوتیفیکیشن را فعال کنید');
      return false;
    }

    if (!transaction.reminderDateTime) return false;

    const reminderDateTime = new Date(transaction.reminderDateTime);
    const now = new Date();

    if (reminderDateTime <= now) {
      alert('زمان یادآوری باید در آینده باشد');
      return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '📌 یادآوری قسط',
            body: `${transaction.title} - مبلغ: ${formatNumber(transaction.amount)} تومان`,
            id: parseInt(transaction.id) % 1000000,
            schedule: { at: reminderDateTime },
            sound: null,
            attachments: null,
            actionTypeId: '',
            extra: null
          }
        ]
      });
      console.log('✅ یادآوری با موفقیت ثبت شد');
      return true;
    } catch (error) {
      console.log('❌ خطا در ثبت یادآوری:', error);
      return false;
    }
  };

  // افزودن تراکنش با قابلیت یادآوری
  const addTransaction = async () => {
    if (!title.trim()) return alert('عنوان را وارد کنید');
    const amt = parseFormattedNumber(amount);
    if (isNaN(amt) || amt <= 0) return alert('مبلغ معتبر وارد کنید');
    if (!selectedDate) return;

    const existing = calendarData[selectedDate] || { transactions: [] };
    const newTransaction: Transaction = { 
      id: Date.now().toString(), 
      title, 
      amount: amt, 
      isPaid: false,
      reminderScheduled: false
    };
    const updated = { transactions: [...existing.transactions, newTransaction] };
    saveData({ ...calendarData, [selectedDate]: updated });
    
    setTitle('');
    setAmount('');
    setShowAddModal(false);

    // پرسش برای ثبت یادآوری
    const wantReminder = confirm('آیا می‌خواهید برای این قسط یادآوری ثبت کنید؟');
    if (wantReminder) {
      setSelectedTransactionForReminder({ dateKey: selectedDate, transactionId: newTransaction.id });
      setReminderText(newTransaction.title);
      setShowReminderModal(true);
    }
  };

  // تایید یادآوری
  const confirmReminder = async () => {
    if (!selectedTransactionForReminder || !reminderDate || !reminderTime) {
      alert('لطفاً تاریخ و ساعت را انتخاب کنید');
      return;
    }

    const reminderDateTime = `${reminderDate}T${reminderTime}`;
    const transaction = calendarData[selectedTransactionForReminder.dateKey]?.transactions.find(
      t => t.id === selectedTransactionForReminder.transactionId
    );

    if (transaction) {
      const updatedTransaction = { ...transaction, reminderDateTime, reminderScheduled: true };
      const dayData = calendarData[selectedTransactionForReminder.dateKey];
      const updatedTransactions = dayData.transactions.map(t => 
        t.id === selectedTransactionForReminder.transactionId ? updatedTransaction : t
      );
      const updatedDay = { transactions: updatedTransactions };
      saveData({ ...calendarData, [selectedTransactionForReminder.dateKey]: updatedDay });

      await scheduleReminder(updatedTransaction, selectedTransactionForReminder.dateKey);
      alert('✅ یادآوری با موفقیت ثبت شد');
    }
    setShowReminderModal(false);
    setSelectedTransactionForReminder(null);
    setReminderText('');
    setReminderDate('');
    setReminderTime('09:00');
  };

  const togglePay = (dateKey: string, id: string) => {
    const day = calendarData[dateKey];
    if (!day) return;
    const updated = day.transactions.map(t => t.id === id ? { ...t, isPaid: !t.isPaid } : t);
    saveData({ ...calendarData, [dateKey]: { transactions: updated } });
  };

  const deleteTrans = (dateKey: string, id: string) => {
    if (!confirm('حذف شود؟')) return;
    const day = calendarData[dateKey];
    if (!day) return;
    const filtered = day.transactions.filter(t => t.id !== id);
    const newData = { ...calendarData };
    if (filtered.length === 0) delete newData[dateKey];
    else newData[dateKey] = { transactions: filtered };
    saveData(newData);
  };

  const openDayDetails = (year: number, month: number, day: number) => {
    const dateKey = getKey(year, month, day);
    setSelectedDate(dateKey);
    setSelectedDayNum(day);
    setShowDayModal(true);
  };

  const openPrayerTimes = (day: number) => {
    const times = getPrayerTimes(day);
    setPrayerTimes(times);
    setShowPrayerModal(true);
  };

  const changeYearMonth = () => {
    setCurrentYear(tempYear);
    setCurrentMonth(tempMonth);
    setShowYearMonthModal(false);
  };

  const getReport = () => {
    if (!reportStart || !reportEnd) return alert('محدوده تاریخ را انتخاب کنید');
    let total = 0, count = 0, paid = 0;
    Object.entries(calendarData).forEach(([date, data]) => {
      if (date >= reportStart && date <= reportEnd) {
        data.transactions.forEach(t => {
          count++;
          if (!t.isPaid) total += t.amount;
          else paid += t.amount;
        });
      }
    });
    alert(`📊 گزارش مالی\n\nاز ${reportStart} تا ${reportEnd}\n\n💰 مجموع بدهی: ${formatNumber(total)} تومان\n📝 کل تراکنش‌ها: ${count}\n✅ مبلغ پرداخت شده: ${formatNumber(paid)} تومان\n⏳ باقی‌مانده: ${formatNumber(total)} تومان`);
  };

  const goToToday = () => {
    setCurrentYear(moment().jYear());
    setCurrentMonth(moment().jMonth());
    setShowDayModal(false);
    setShowAddModal(false);
    setShowPrayerModal(false);
    setShowReportModal(false);
    setShowYearMonthModal(false);
    setSelectedDate(null);
    setSelectedDayNum(null);
  };

  // هندلر تغییر مبلغ با جداکننده سه‌رقمی
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // حذف همه کاراکترهای غیرعددی
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      setAmount('');
      return;
    }
    // تبدیل به عدد و فرمت با جداکننده
    const number = parseInt(numericValue, 10);
    setAmount(number.toLocaleString('en-US'));
  };

  const renderDays = () => {
    const days: React.ReactNode[] = [];
    const daysInMonth = getMonthDays(currentYear, currentMonth);
    const firstDay = moment(`${currentYear}/${currentMonth + 1}/1`, 'jYYYY/jM/jD').day();
    const startOffset = firstDay === 6 ? 0 : firstDay + 1;

    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`e-${i}`} className="day empty"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const debt = getDayDebt(currentYear, currentMonth, d);
      const isToday = moment().jYear() === currentYear && 
                      moment().jMonth() === currentMonth && 
                      moment().jDate() === d;

      days.push(
        <div
          key={d}
          className={`day ${debt > 0 ? 'has-debt' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => openDayDetails(currentYear, currentMonth, d)}
        >
          <span className="day-num">{d}</span>
          {debt > 0 && (
            <span className="debt-badge">
              {formatNumber(debt)}
            </span>
          )}
        </div>
      );
    }
    return days;
  };

  const selectedDayData = selectedDate ? calendarData[selectedDate] : null;
  const selectedDayDebt = selectedDate && selectedDayNum ? 
    getDayDebt(currentYear, currentMonth, selectedDayNum) : 0;

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <button className="today-btn" onClick={goToToday} title="برو به امروز">
            📅 امروز
          </button>
        </div>
        <h1>دفترچه حساب روزمره</h1>
        <button className="menu-btn" onClick={() => setShowReportModal(true)}>⋮</button>
      </div>

      <div className="month-nav">
        <button onClick={() => setCurrentMonth((prev: number) => Math.max(0, prev - 1))}>◀</button>
        <div className="month-year-selector" onClick={() => {
          setTempYear(currentYear);
          setTempMonth(currentMonth);
          setShowYearMonthModal(true);
        }}>
          <span>{persianMonths[currentMonth]}</span>
          <span className="year-text">{currentYear}</span>
          <span className="dropdown-icon">▼</span>
        </div>
        <button onClick={() => setCurrentMonth((prev: number) => Math.min(11, prev + 1))}>▶</button>
      </div>

      <div className="weekdays">
        {weekDays.map((d: string) => <div key={d} className="weekday">{d}</div>)}
      </div>

      <div className="calendar">
        {renderDays()}
      </div>

      {/* سه دسته‌بندی جدید */}
      <div className="stats-container">
        <div className="stat-card remaining">
          <span className="stat-label">💰 باقی‌مانده</span>
          <strong className="stat-value">{formatNumber(getMonthRemaining())}</strong>
          <span className="stat-unit">تومان</span>
        </div>
        <div className="stat-card paid">
          <span className="stat-label">✅ پرداخت شده</span>
          <strong className="stat-value">{formatNumber(getMonthPaid())}</strong>
          <span className="stat-unit">تومان</span>
        </div>
        <div className="stat-card total">
          <span className="stat-label">📊 کل ماه</span>
          <strong className="stat-value">{formatNumber(getMonthTotal())}</strong>
          <span className="stat-unit">تومان</span>
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text-fa">
            ساخته شده توسط <strong>سیمرغ فناوری هوشمند ایرانیان</strong>
          </div>
          <div className="footer-text-en">
            Made by <strong>Simorgh Intelligent Iranian Technology</strong>
          </div>
          <div className="footer-copyright">
            © 2026 Simorgh AI | 
            <a href="https://www.simorghai.com" target="_blank" rel="noopener noreferrer">
              www.simorghai.com
            </a>
          </div>
        </div>
      </footer>

      {/* مودال‌ها... (بقیه مودال‌ها به همین صورت می‌مانند) */}

      {showYearMonthModal && (
        <div className="modal" onClick={() => setShowYearMonthModal(false)}>
          <div className="modal-box select-modal" onClick={e => e.stopPropagation()}>
            <h3>انتخاب سال و ماه</h3>
            <div className="select-row">
              <select value={tempYear} onChange={e => setTempYear(parseInt(e.target.value))}>
                {years.map((y: number) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={tempMonth} onChange={e => setTempMonth(parseInt(e.target.value))}>
                {persianMonths.map((m: string, idx: number) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            <div className="modal-btns">
              <button className="submit" onClick={changeYearMonth}>تایید</button>
              <button className="cancel" onClick={() => setShowYearMonthModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {showDayModal && selectedDate && selectedDayNum && (
        <div className="modal" onClick={() => setShowDayModal(false)}>
          <div className="modal-box day-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>جزئیات روز {selectedDayNum} {persianMonths[currentMonth]}</h3>
              <button className="close-modal" onClick={() => setShowDayModal(false)}>✕</button>
            </div>
            
            <div className="day-debt-summary">
              <span>مجموع بدهی این روز:</span>
              <strong>{formatNumber(selectedDayDebt)} تومان</strong>
            </div>

            <div className="modal-buttons-row">
              <button className="add-trans-btn" onClick={() => {
                setShowDayModal(false);
                setShowAddModal(true);
              }}>
                + افزودن تراکنش
              </button>
              <button className="prayer-btn-modal" onClick={() => {
                openPrayerTimes(selectedDayNum);
              }}>
                🕌 اوقات شرعی
              </button>
            </div>

            <div className="transactions-list-modal">
              {!selectedDayData?.transactions.length ? (
                <div className="empty-trans">هیچ تراکنشی ثبت نشده است</div>
              ) : (
                selectedDayData.transactions.map((t: Transaction) => (
                  <div key={t.id} className={`trans-item-modal ${t.isPaid ? 'paid' : ''}`}>
                    <div className="trans-info-modal">
                      <span className="trans-title-modal">{t.title}</span>
                      <span className="trans-amount-modal">{formatNumber(t.amount)} تومان</span>
                      {t.reminderDateTime && <span className="reminder-badge">⏰</span>}
                    </div>
                    <div className="trans-actions-modal">
                      <button className="pay-tick-modal" onClick={() => togglePay(selectedDate, t.id)}>
                        {t.isPaid ? '✓ پرداخت شده' : '○ پرداخت نشده'}
                      </button>
                      <button className="delete-trans-modal" onClick={() => deleteTrans(selectedDate, t.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>➕ افزودن تراکنش جدید</h3>
            <input 
              type="text" 
              placeholder="عنوان (مثال: قبوض آب و برق)" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
            />
            <input 
              type="text" 
              placeholder="مبلغ (تومان)" 
              value={amount} 
              onChange={handleAmountChange}
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
            <div className="modal-btns">
              <button className="submit" onClick={addTransaction}>ثبت</button>
              <button className="cancel" onClick={() => setShowAddModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {showPrayerModal && prayerTimes && (
        <div className="modal" onClick={() => setShowPrayerModal(false)}>
          <div className="modal-box prayer-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🕌 اوقات شرعی</h3>
              <button className="close-modal" onClick={() => setShowPrayerModal(false)}>✕</button>
            </div>
            <div className="prayer-list">
              <div className="prayer-row"><span>اذان صبح:</span><strong>{prayerTimes.fajr}</strong></div>
              <div className="prayer-row"><span>طلوع آفتاب:</span><strong>{prayerTimes.sunrise}</strong></div>
              <div className="prayer-row"><span>اذان ظهر:</span><strong>{prayerTimes.dhuhr}</strong></div>
              <div className="prayer-row"><span>اذان عصر:</span><strong>{prayerTimes.asr}</strong></div>
              <div className="prayer-row"><span>اذان مغرب:</span><strong>{prayerTimes.maghrib}</strong></div>
              <div className="prayer-row"><span>اذان عشاء:</span><strong>{prayerTimes.isha}</strong></div>
            </div>
            <button className="close-prayer" onClick={() => setShowPrayerModal(false)}>بستن</button>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal" onClick={() => setShowReportModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>📊 گزارش مالی</h3>
            <input 
              type="date" 
              placeholder="تاریخ شروع" 
              value={reportStart} 
              onChange={e => setReportStart(e.target.value)} 
            />
            <input 
              type="date" 
              placeholder="تاریخ پایان" 
              value={reportEnd} 
              onChange={e => setReportEnd(e.target.value)} 
            />
            <div className="modal-btns">
              <button className="submit" onClick={getReport}>مشاهده گزارش</button>
              <button className="cancel" onClick={() => setShowReportModal(false)}>بستن</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال یادآوری */}
      {showReminderModal && (
        <div className="modal" onClick={() => setShowReminderModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>⏰ تنظیم یادآوری</h3>
            <p style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
              برای: <strong>{reminderText}</strong>
            </p>
            <input 
              type="date" 
              value={reminderDate} 
              onChange={e => setReminderDate(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <input 
              type="time" 
              value={reminderTime} 
              onChange={e => setReminderTime(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <div className="modal-btns">
              <button className="submit" onClick={confirmReminder}>ثبت یادآوری</button>
              <button className="cancel" onClick={() => setShowReminderModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
