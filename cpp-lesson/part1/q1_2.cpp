#include <iostream>

int main() {
    int n {0};
    bool flag {false};              // ① 最初は単語の「外」

    for (char ch{}; std::cin >> std::noskipws >> ch; ) {
        if (ch == ' ' || ch == '\t' || ch == '\n') {
            flag = false;           // ③ 空白 → 単語の外へ
        }
        else if (!flag) {           // ④ 空白でない & 直前は外だった
            flag = true;            // ⑤ 単語の中へ入った
            ++n;                    // ⑥ 単語を1つ発見
        }
    }

    std::cout << n << "\n";
}
