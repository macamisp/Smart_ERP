import fitz
import sys

doc = fitz.open('Smart Restaurant ERP_Business Requirements Document Version_2.pdf')
text = ""
for page in doc:
    text += page.get_text()

with open('brd2.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
