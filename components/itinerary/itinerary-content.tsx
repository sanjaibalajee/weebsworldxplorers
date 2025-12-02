"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Clock, Plane, Sun, Palmtree } from "lucide-react";

type ItineraryItem = {
  time: string;
  title: string;
  description?: string;
  isOption?: boolean;
  optionA?: string;
  optionB?: string;
};

type DaySchedule = {
  day: number;
  date: string;
  location: string;
  icon: "plane" | "sun" | "palmtree";
  items: ItineraryItem[];
};

const itinerary: DaySchedule[] = [
  {
    day: 1,
    date: "Dec 3",
    location: "Pattaya",
    icon: "plane",
    items: [
      { time: "9:00 AM", title: "Arrive at our place", description: "Check-in, rest, swim, Grab food" },
      { time: "1:30 PM", title: "Start Day", description: "Take Songthaew/Bolt to main road" },
      { time: "1:45 PM – 3:00 PM", title: "Pattaya Floating Market", description: "Walk around the boardwalks, try snacks. Entry ~200 THB" },
      { time: "3:15 PM – 4:30 PM", title: "Underwater World Pattaya", description: "Shark & ray tunnel, fully A/C" },
      { time: "4:30 PM – 5:00 PM", title: "Travel to Bali Hai Pier area" },
      { time: "5:00 PM – 6:00 PM", title: "Pattaya City Sign Viewpoint", description: "Great place for sunset photos" },
      { time: "6:00 PM – 7:30 PM", title: "Evening Activity", isOption: true, optionA: "EasyKart Go-Karting (Fun Activity)", optionB: "Beach Road Evening Walk from Central Festival" },
      { time: "7:30 PM onwards", title: "Dinner", description: "Central Festival or Beach Road cafés" },
    ],
  },
  {
    day: 2,
    date: "Dec 4",
    location: "Pattaya",
    icon: "sun",
    items: [
      { time: "10:00 AM", title: "Breakfast + swim at villa" },
      { time: "11:30 AM", title: "Travel to North Pattaya" },
      { time: "12:00 PM – 2:00 PM", title: "Sanctuary of Truth", description: "Hand-carved wooden temple. (Wear long pants)" },
      { time: "2:00 PM – 4:00 PM", title: "Terminal 21 Pattaya", description: "Very cheap & clean food court (Pier 21)" },
      { time: "4:00 PM – 5:00 PM", title: "Return to Jomtien" },
      { time: "5:00 PM – 7:00 PM", title: "Jomtien Beach", description: "Relax on beach chairs & watch the sunset" },
      { time: "7:00 PM onwards", title: "Jomtien Market", description: "Street food & shopping" },
    ],
  },
  {
    day: 3,
    date: "Dec 5",
    location: "Bangkok",
    icon: "plane",
    items: [
      { time: "12:00 PM", title: "Arrive at hotel, lunch" },
      { time: "1:00 PM – 1:30 PM", title: "Travel to Lumpini Park" },
      { time: "1:30 PM – 2:45 PM", title: "Lumpini Park", description: "Walk around lake, spot monitor lizards" },
      { time: "2:45 PM – 3:30 PM", title: "Travel to ICONSIAM", description: "Via BTS + free boat" },
      { time: "3:30 PM – 5:30 PM", title: "ICONSIAM", description: "Explore SookSiam, riverside area" },
      { time: "5:30 PM – 6:00 PM", title: "Travel to Chinatown" },
      { time: "6:00 PM – 8:30 PM", title: "Chinatown (Yaowarat)", description: "Street food + evening vibes" },
      { time: "8:30 PM", title: "Return hotel", description: "Early morning Krabi flight" },
    ],
  },
  {
    day: 4,
    date: "Dec 6",
    location: "Krabi",
    icon: "palmtree",
    items: [
      { time: "Day Trip", title: "Tiger Cave Temple OR Ao Thalane Kayaking", description: "~45 mins by car • 734 THB" },
    ],
  },
  {
    day: 5,
    date: "Dec 7",
    location: "Krabi",
    icon: "palmtree",
    items: [
      { time: "8 AM – 2 PM", title: "4-Island Tour", description: "2200 Rs / 800 THB" },
      { time: "Return by 6 PM", title: "Railay Beach", description: "1000 Rs / 300 THB" },
    ],
  },
  {
    day: 6,
    date: "Dec 8",
    location: "Krabi",
    icon: "palmtree",
    items: [
      { time: "8 AM – 3:15 PM", title: "Hong Island Tour", description: "4000 Rs / 1427 THB" },
    ],
  },
  {
    day: 7,
    date: "Dec 9",
    location: "Bangkok",
    icon: "sun",
    items: [
      { time: "9:30 AM", title: "Arrive at Grand Palace" },
      { time: "9:30 – 11:50", title: "Explore Grand Palace & Emerald Buddha" },
      { time: "12:10 – 1:10", title: "Wat Pho", description: "Reclining Buddha & temple gardens" },
      { time: "1:10 – 1:50", title: "Lunch at Tha Tien Pier", description: "Riverside restaurants" },
      { time: "1:50", title: "Take the ferry to Wat Arun" },
      { time: "2:10 – 3:30", title: "Explore Wat Arun" },
      { time: "3:30", title: "Santichaiprakarn Park", description: "Relax, then walk to Soi Rambuttri (calm, café street). Spend evening there" },
    ],
  },
  {
    day: 8,
    date: "Dec 10",
    location: "Bangkok",
    icon: "plane",
    items: [
      { time: "9:00 AM", title: "Check out & store luggage" },
      { time: "9:30 – 10:00", title: "Travel to Chong Nonsi" },
      { time: "10:00 – 11:30", title: "Mahanakhon Skywalk", description: "Glass floor experience" },
      { time: "11:30 – 12:00", title: "Travel to Siam" },
      { time: "12:00 – 12:45", title: "Siam Square", description: "Trendy shopping, cafés" },
      { time: "12:45 – 3:00", title: "MBK Mall", description: "Shopping & lunch" },
      { time: "3:15 – 4:45", title: "Terminal 21 Asok", description: "Photo spots by themes (Tokyo, London, etc.)" },
      { time: "5:00 PM", title: "Leave Terminal 21" },
      { time: "5:30 PM", title: "Pick luggage & head to airport" },
    ],
  },
];

function DayIcon({ type }: { type: "plane" | "sun" | "palmtree" }) {
  switch (type) {
    case "plane":
      return <Plane className="w-4 h-4" />;
    case "sun":
      return <Sun className="w-4 h-4" />;
    case "palmtree":
      return <Palmtree className="w-4 h-4" />;
  }
}

export function ItineraryContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Thailand Itinerary</h1>
          <p className="text-sm text-muted-foreground">Dec 3 - Dec 10, 2025</p>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-6">
        {itinerary.map((day) => (
          <div key={day.day} className="space-y-3">
            {/* Day Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <DayIcon type={day.icon} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Day {day.day}</span>
                  <span className="text-xs text-muted-foreground">({day.date})</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{day.location}</span>
                </div>
              </div>
            </div>

            {/* Timeline Items */}
            <div className="ml-5 border-l-2 border-muted pl-6 space-y-4">
              {day.items.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-background border-2 border-primary" />

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {item.isOption && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                          <span className="font-medium">Option A:</span> {item.optionA}
                        </div>
                        <div className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">
                          <span className="font-medium">Option B:</span> {item.optionB}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
