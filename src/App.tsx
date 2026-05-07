import { useState, useEffect } from 'react';
import './App.css';
import moment from 'moment-jalaali';

moment.loadPersian({ dialect: 'persian-modern' });

const persianMonths: string[] = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const weekDays: string[] = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// سال‌های قابل انتخاب
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

// اوقات شرعی برای هر روز
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
}

interface DayData {
  transactions: Transaction[];
}

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
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [calendarData, setCalendarData] = useState<{ [key: string]: DayData }>({});
  const [reportStart, setReportStart] = useState<string>('');
  const [reportEnd, setReportEnd] = useState<string>('');
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [tempYear, setTempYear] = useState<number>(currentYear);
  const [tempMonth, setTempMonth] = useState<number>(currentMonth);

  useEffect(() => {
    const saved = localStorage.getItem('calendarData');
    if (saved) setCalendarData(JSON.parse(saved));
  }, []);

  const saveData = (data: any) => {
    localStorage.setItem('calendarData', JSON.stringify(data));
    setCalendarData(data);
  };

  const getKey = (y: number, m: number, d: number): string => `${y}-${m + 1}-${d}`;

  const getDayDebt = (y: number, m: number, d: number): number => {
    const day = calendarData[getKey(y, m, d)];
    if (!day) return 0;
    return day.transactions.filter(t => !t.isPaid).reduce((s, t) => s + t.amount, 0);
  };

  const getMonthTotal = (): number => {
    let total = 0;
    const days = getMonthDays(currentYear, currentMonth);
    for (let d = 1; d <= days; d++) {
      total += getDayDebt(currentYear, currentMonth, d);
    }
    return total;
  };

  // بازگشت به تاریخ امروز
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

  const addTransaction = () => {
    if (!title.trim()) return alert('عنوان را وارد کنید');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return alert('مبلغ معتبر وارد کنید');
    if (!selectedDate) return;

    const existing = calendarData[selectedDate] || { transactions: [] };
    const newTransaction = { id: Date.now().toString(), title, amount: amt, isPaid: false };
    const updated = { transactions: [...existing.transactions, newTransaction] };
    saveData({ ...calendarData, [selectedDate]: updated });
    setTitle('');
    setAmount('');
    setShowAddModal(false);
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
          else paid++;
        });
      }
    });
    alert(`📊 گزارش مالی\n\nاز ${reportStart} تا ${reportEnd}\n\n💰 مجموع بدهی: ${total.toLocaleString()} تومان\n📝 کل تراکنش‌ها: ${count}\n✅ پرداخت شده: ${paid}\n⏳ پرداخت نشده: ${count - paid}`);
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
          onClick={() => openDayDetails(currentYear, currentMonth, d)}  // ✅ تغییر: دوبار کلیک → تک کلیک
        >
          <span className="day-num">{d}</span>
          {debt > 0 && (
            <span className="debt-badge">
              {debt.toLocaleString()}
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
      {/* هدر با دکمه امروز */}
      <div className="header">
        <div className="header-left">
          <button className="today-btn" onClick={goToToday} title="برو به امروز">
            📅 امروز
          </button>
        </div>
        <h1>دفترچه حساب روزمره</h1>
        <button className="menu-btn" onClick={() => setShowReportModal(true)}>⋮</button>
      </div>

      {/* انتخاب ماه و سال */}
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

      {/* روزهای هفته */}
      <div className="weekdays">
        {weekDays.map((d: string) => <div key={d} className="weekday">{d}</div>)}
      </div>

      {/* تقویم */}
      <div className="calendar">
        {renderDays()}
      </div>

      {/* مجموع بدهی ماه */}
      <div className="month-total">
        <span>💰 مجموع بدهی این ماه</span>
        <strong>{getMonthTotal().toLocaleString()} تومان</strong>
      </div>

      {/* ==================== فوتر جدید ==================== */}
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
      {/* ==================== پایان فوتر ==================== */}

      {/* مودال انتخاب سال و ماه */}
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

      {/* مودال جزئیات روز */}
      {showDayModal && selectedDate && selectedDayNum && (
        <div className="modal" onClick={() => setShowDayModal(false)}>
          <div className="modal-box day-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>جزئیات روز {selectedDayNum} {persianMonths[currentMonth]}</h3>
              <button className="close-modal" onClick={() => setShowDayModal(false)}>✕</button>
            </div>
            
            <div className="day-debt-summary">
              <span>مجموع بدهی این روز:</span>
              <strong>{selectedDayDebt.toLocaleString()} تومان</strong>
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
                      <span className="trans-amount-modal">{t.amount.toLocaleString()} تومان</span>
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

      {/* مودال افزودن تراکنش */}
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
              type="number" 
              placeholder="مبلغ (تومان)" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
            <div className="modal-btns">
              <button className="submit" onClick={addTransaction}>ثبت</button>
              <button className="cancel" onClick={() => setShowAddModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال اوقات شرعی */}
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

      {/* مودال گزارش */}
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
    </div>
  );
}

export default App;
