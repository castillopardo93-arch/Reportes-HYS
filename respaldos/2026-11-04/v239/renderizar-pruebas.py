from pathlib import Path
import pypdfium2 as pdf
from PIL import Image, ImageDraw
root = Path(__file__).parent / 'pruebas-pdf'
for file in root.glob('*paginacion.pdf'):
    doc = pdf.PdfDocument(str(file))
    thumbs = [p.render(scale=0.52).to_pil().convert('RGB') for p in doc]
    w, h = thumbs[0].size
    sheet = Image.new('RGB', (w*4, (h+22)*((len(thumbs)+3)//4)), '#dce5ed')
    draw = ImageDraw.Draw(sheet)
    for i, im in enumerate(thumbs):
        x, y = (i%4)*w, (i//4)*(h+22)
        sheet.paste(im, (x,y+22)); draw.text((x+8,y+4), f'{file.stem} / {i+1}', fill='black')
    sheet.save(root/(file.stem+'.png'))
doc = pdf.PdfDocument(str(root/'APR-texto-extenso.pdf'))
for i, page in enumerate(doc):
    page.render(scale=0.9).to_pil().save(root/f'texto-extenso-{i+1}.png')
print('Todas las páginas PDF renderizadas para revisión visual.')
