
from googletrans import Translator, LANGUAGES

def translate(text = "type", source = "source language", dest = "destination language"):
    text1 = text
    source1 = source
    dest1 = dest
    trans = Translator()
    trans1 = trans.translate(text1, src = source1, dest = dest1)
    return trans1.text

list_txt = list(LANGUAGES.values())

def display_lang():
  print(list_txt)
