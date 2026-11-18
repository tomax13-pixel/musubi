#include <iostream>

int main() {
    char ch {};
    int best {0};               // これまでで最長の単語の長さ
    int cur  {0};               // いま読んでいる単語の長さ

    while (std::cin >> std::noskipws >> ch) {
        if (ch == ' ' || ch == '\t' || ch == '\n') {
            if (cur > best)     // 更新は「大きいときだけ」
                best = cur;
            cur = 0;            // リセットは「必ず」  ← ifの外！
        }
        else {
            ++cur;
        }
    }

    if (cur > best)             // 最後の単語の取りこぼし対策
        best = cur;

    std::cout << best << "\n";
}
