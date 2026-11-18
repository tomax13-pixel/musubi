#include <iostream>

int main() {
    char ch {};
    int n {0};

    while (std::cin >> std::noskipws >> ch) {
        if (ch == '\n')
            ++n;
    }

    std::cout << n << "\n";
}
