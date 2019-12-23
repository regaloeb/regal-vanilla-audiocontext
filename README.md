# regal-vanilla-audiocontext
Visualisation du spectre audio de sources audios et/ou vidéos HTML5 dans des canvas.

Petit constructeur Vanilla pour le fun (et aussi pour pouvoir placer facilement plusieurs objets spectrumSound dans la même page !).

Simple comme bonjour (à utiliser):
Inclure le constructeur à sa page:
<script src="js/vanilla-regalSpectrum.min.js"></script>

Déclarer les modules en bas de page (ou au domready):
var spectrumSound = document.querySelectorAll('.regal-sound');
for(var i=0; i<spectrumSound.length; i++){
    new RegalSpectrum(spectrumSound[i], {'stopOthers': 1});
}

Propriétés :
spectreView: booléen (1 par défaut), pour afficher ou pas les barres de fréquences.
sinusoidView: booléen (1 par défaut), pour afficher ou pas la forme de l'onde.
circlesView: booléen (1 par défaut), pour afficher ou pas les cercles concentriques qui suivent la barre de progression.
stopOthers: booléen (1 par défaut), pour arrêter ou pas le son en cours.
color: '251,233,21' (random par défaut): string, couleur RVB des barres de fréquence, des cercles concentriques et du niveau de volume. La couleur complémentaire est appliquée à la forme d'onde.
volumeView: booléen (1 par défaut), pour afficher ou pas le niveau de volume.
autoPlay: booléen (0 par défaut), pour lancer le son ou la vidéo par défaut (sauf pour Safari et les mobiles qui bloquent les autoplay).
loop: booléen (0 par défaut), pour lire le son ou la vidéo en boucle.
spectrumFft: number (multiple de 16, 256 par défaut), détermine le nombre de barres affichées.
sineWaveFft: number (multiple de 16, 1024 par défaut), détermine le détail appliqué à la forme d'onde.

Possibilité de déclarer ces propriétés avec attributs data-PROP ou data-values dans le HTML ou au moment de l'initialisation javascript du plugin :
data-circleView="1"
data-values="{'spectreView':0, 'sinusoidView':1, 'circlesView':1, 'stopOthers': 0, 'color': '251,233,21'}"
data-values prend le dessus sur data-PROP.
$(this).regalSpectrum({'spectreView':0, 'sinusoidView':1, 'circlesView':1, 'stopOthers': 0});
Propriété déclarée en JS prend le dessus sur celle déclarée en data dans le HTML.

Méthodes publiques
plugin.play: pour lancer la lecture.
plugin.pause: pour mettre en pause.
plugin.seek(time): pour placer la tête de lecture à moment précis. time en secondes.
plugin.setVolume(vol): pour changer le volume. vol décimal compris entre 0 et 1.
plugin.changeColor(color): pour changer les couleurs des canvas. color est une string RR,VV,BB.
plugin.showPrevisu(): recalcule et redessine la Waveform (utile pour un player unique avec une liste de sons, comme sur garagerock.regaloeb.com).
plugin est une référence à l'objet RegalSpectrum

Chapitrage possible avec visualisation sur la barre de progression.
&lt;ul class="chapters-line">
    &lt;li><a href="#" data-time="0" data-end="198" class="chapter-line icon-arrow-down">Titre chapitre&lt;/a>&lt;/li>
    ...
&lt;/ul>
    data-time le timecode du début du chapitre en secondes.
    data-end le timecode de la fin du chapitre en secondes.
class="chapter-line ..." obligatoire.
Ensemble chapitres à placer dans la structure :
&lt;div class="seekbar">&lt;div class="progress">
Lorsque la vidéo atteint data-time, on applique à chapter-line la classe active.
Lorsque la vidéo atteint data-end, on applique à chapter-line la classe done.

Non-compatible avec IE et EDGE<=17), le plugin devient juste un player son ou vidéo avec barre de progression... dommage pour eux !
Mais le chapitrage fonctionne, c'est toujours ça.

Démo: http://www.regaloeb.com/pages/vanilla-audiocontext/
