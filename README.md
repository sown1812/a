# 🌌 Planet Merge — Fruit Cosmos

> Trò chơi ghép trái cây phong cách *Suika Game* với chủ đề vũ trụ — vật lý đàn hồi, trọng lực hướng tâm, âm thanh ASMR tổng hợp.

---

## Chạy nhanh

| Cách | Lệnh / Hành động | Ghi chú |
|---|---|---|
| **Offline (khuyên dùng)** | Mở `suika_planet_offline.html` | Không cần server, chơi được ngay |
| **Python** | `python -m http.server 8000` → `localhost:8000` | |
| **Node.js** | `npx serve` | |
| **VS Code** | Cài *Live Server* → nhấn **Go Live** | |

---

## Cách chơi

**Mục tiêu:** Ghép đôi trái cây cùng loại để chúng tiến hóa lên cấp cao hơn, đạt mục tiêu màn trước khi hết lượt.

| Thao tác | Hành động |
|---|---|
| Click / Tap | Bắn quả từ quỹ đạo vào tâm hành tinh |
| `Space` | Bắn quả bằng bàn phím |

**Thua cuộc:** Trái cây xếp vượt vạch giới hạn liên tục trong **3 giây** → Game Over.

---

## Bảng tiến hóa

| Cấp | Tên | Emoji | Bán kính |
|:---:|---|:---:|:---:|
| 0 | Cherry | 🍒 | 12 px |
| 1 | Strawberry | 🍓 | 16 px |
| 2 | Grape | 🍇 | 21 px |
| 3 | Tangerine | 🍊 | 27 px |
| 4 | Persimmon | 🍅 | 33 px |
| 5 | Apple | 🍎 | 40 px |
| 6 | Pear | 🍐 | 48 px |
| 7 | Peach | 🍑 | 56 px |
| 8 | Pineapple | 🍍 | 65 px |
| 9 | Melon | 🍈 | 75 px |
| 10 | Watermelon | 🍉 | 86 px |

---

## Màn chơi

| # | Tên | Mục tiêu | Lượt |
|:---:|---|---|:---:|
| 1 | Cosmic Intro | Ghép ra 1 Quýt 🍊 | 12 |
| 2 | Sparkling Vineyard | 3 Nho 🍇 + 1 Hồng 🍅 | 15 |
| 3 | Red Apple Gravity | 1 Táo 🍎 | 25 |
| 4 | Peach Cosmos | 1500 điểm + 1 Đào 🍑 | 35 |
| 5 | Melon Nebula | 1 Dưa lưới 🍈 + 8 Dâu 🍓 | 50 |
| 6 | Ultimate Cosmos | 1 Dưa hấu 🍉 | 75 |

---

## Cấu trúc mã nguồn

```
suika_planet/
├── index.html                  # Giao diện chính (HUD, Canvas, Overlay)
├── suika_planet_offline.html   # Bản all-in-one (không cần server)
├── style.css                   # Giao diện Glassmorphism + Cosmic theme
├── game.js                     # Orchestrator: luồng game, input, UI, shop
├── physics.js                  # Verlet physics, va chạm, Squash & Stretch
├── level.js                    # Cấu hình trái cây + mục tiêu từng màn
├── particles.js                # Hệ thống hạt (nước ép, confetti)
└── audio.js                    # Web Audio API ASMR synth (không cần .mp3)
```

---

## Điểm kỹ thuật nổi bật

- **ASMR Synth** — tổng hợp âm thanh trực tiếp bằng Web Audio API (Sine/Triangle wave), không cần file nhạc ngoài.
- **Verlet + Lò xo** — vật lý đàn hồi: quả bị méo khi va chạm rồi nảy ngược theo mô hình lò xo.
- **Biểu cảm động** — mắt quả tự nhấp nháy, đổi biểu cảm khi sắp va chạm hoặc ghép đôi.
- **Performance Mode** — tắt đổ bóng & giảm hạt phát ra, giữ 60 FPS trên thiết bị yếu.
