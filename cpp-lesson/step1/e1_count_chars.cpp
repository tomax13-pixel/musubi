#include <iostream>

int main() {
    char ch {};
    int n {0};

    while (std::cin >> std::noskipws >> ch) {
        ++n;
    }

    std::cout << n << "\n";
}
