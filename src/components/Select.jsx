import React, { useState } from 'react';
import { Icon } from "@iconify/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';

export default function Select_() {
  const [selectedValue, setSelectedValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null); 
  const [selectedTime, setSelectedTime] = useState('10:00');

  const handleSelect = (value) => {
    setSelectedValue(value);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  return (
    <div className="flex gap-4 mt-4">
      {/* Основной селект */}
      <div className="w-1/2">
        <div
          className={`flex items-center justify-between p-2 border rounded-2xl cursor-pointer transition-all duration-300 bg-white ${
            isOpen ? 'border-blue-500' : 'border-gray-300'
          }`}
          onClick={toggleMenu}
        >
          {/* Иконка слева */}
          <div className="mr-2">
            <Icon icon="basil:clock-outline" className="text-blue-500 text-xl" />
          </div>

          {/* Текст по умолчанию или выбранное значение */}
          <div className="flex-grow">
            {selectedValue
              ? selectedValue === "1"
                ? "Start Now"
                : "Start Later"
              : "Select Option"}
          </div>

          <div className="text-lg">{isOpen ? '▲' : '▼'}</div>
        </div>

        {/* Раскрывающееся меню */}
        <div
          className={`transition-all duration-300 ease-in-out transform ${
            isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden mt-2 bg-white border rounded-lg shadow-lg`}
        >
          <div
            className="p-2 text-gray-700 hover:bg-gray-200 cursor-pointer"
            onClick={() => handleSelect("1")}
          >
            Start Now
          </div>
          <div
            className="p-2 text-gray-700 hover:bg-gray-200 cursor-pointer"
            onClick={() => handleSelect("0")}
          >
            Start Later
          </div>
        </div>
      </div>

      {/* Дополнительные селекты (отображаются только при выборе "Start Later") */}
      {selectedValue === "0" && (
        <div className="flex flex-col justify-between w-1/2">
          {/* Первый дополнительный селект - Календарь */}
          <div className="flex items-center justify-between p-2 border rounded-2xl bg-white border-gray-300">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              minDate={today} // Минимальная дата - сегодня
              maxDate={nextWeek} // Максимальная дата - через неделю
              placeholderText="Select Date"
              className="w-full text-gray-700 outline-none cursor-pointer"
            />
          </div>

          {/* Второй дополнительный селект - Время */}
          <div className="flex items-center justify-between p-2 border rounded-2xl bg-white border-gray-300 mt-2">
            <TimePicker
              onChange={setSelectedTime}
              value={selectedTime}
              className="w-full text-gray-700"
              disableClock
            />
          </div>
        </div>
      )}
    </div>
  );
}
