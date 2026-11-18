#include <iostream>

int main() {
    char ch {};
    int n {0};
    bool flag {false};

    while (std::cin >> std::noskipws >> ch) {
        if (ch == ' ' || ch == '\t' || ch == '\n') {
            flag = false;
        }
        else if (!flag) {
            flag = true;
            ++n;
        }
    }

    std::cout << n << "\n";
}
